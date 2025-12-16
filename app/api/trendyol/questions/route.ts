
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getOrganizationId } from "@/lib/accessControl";

// CAUTION: This route is LEGACY/BACKUP. 
// Main logic has been moved to `app/actions/questionActions.ts`.
// We keep this secure for external Webhook compatibility if needed.

const getTrendyolCredentials = (account: any) => {
  return {
    supplierId: account.supplier_id,
    apiKey: account.api_key,
    apiSecret: account.api_secret,
  };
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Get all Trendyol accounts (SECURED)
    const { data: accounts, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('organization_id', orgId) // Secured
      .ilike('platform', '%trendyol%');

    if (accountError || !accounts) {
      return NextResponse.json({ success: false, message: 'Mağaza bulunamadı' }, { status: 404 });
    }

    let totalSaved = 0;
    const errors: string[] = [];

    // 2. Loop through each account
    for (const account of accounts) {
      const { supplierId, apiKey, apiSecret } = getTrendyolCredentials(account);
      if (!supplierId || !apiKey || !apiSecret) {
        errors.push(`${account.store_name || 'Mağaza'}: Eksik API anahtarları`);
        continue;
      }

      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const url = `https://apigw.trendyol.com/integration/qna/sellers/${supplierId}/questions/filter?supplierId=${supplierId}`;

      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'User-Agent': `${supplierId} - SelfIntegration`
          }
        });

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`${account.store_name}: Trendyol API Hatası (${response.status}) - ${errText}`);
          continue;
        }

        const data = await response.json();

        // 4. Upsert questions to database
        if (data && data.content && Array.isArray(data.content)) {
          for (const q of data.content) {

            const questionData = {
              id: q.id,
              store_id: account.id,
              organization_id: orgId, // SECURED
              customer_id: q.customerId,
              product_name: q.productName,
              product_image: q.imageUrl,
              text: q.text,
              customer_name: q.userName,
              status: q.status,
              created_date: new Date(q.creationDate).toISOString(),
              answer_text: q.answer?.text || null,
              answer_date: q.answer?.creationDate ? new Date(q.answer.creationDate).toISOString() : null,
              web_url: q.webUrl,
              raw_data: q
            };

            const { error: upsertError } = await supabase
              .from('marketplace_questions')
              .upsert(questionData, { onConflict: 'id' });

            if (upsertError) {
              errors.push(`DB Hatası (${account.store_name}): ${upsertError.message}`);
            } else {
              totalSaved++;
            }
          }
        }
      } catch (fetchError: any) {
        errors.push(`${account.store_name}: İstek Hatası - ${fetchError.message}`);
      }
    }

    return NextResponse.json({ success: true, count: totalSaved, warnings: errors });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const { questionId, text, storeId } = body;

    if (!questionId || !text || !storeId) {
      return NextResponse.json({ success: false, error: 'Eksik parametreler' }, { status: 400 });
    }

    // 1. Get credentials for the store (SECURED)
    const { data: account, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('id', storeId)
      .eq('organization_id', orgId) // Secured
      .single();

    if (accountError || !account) {
      return NextResponse.json({ success: false, error: 'Mağaza bulunamadı veya yetkisiz erişim' }, { status: 404 });
    }

    const { supplierId, apiKey, apiSecret } = getTrendyolCredentials(account);
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // 2. Call Trendyol Create Answer API
    const url = `https://apigw.trendyol.com/integration/qna/sellers/${supplierId}/questions/${questionId}/answers`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': `${supplierId} - SelfIntegration`
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, error: `Trendyol Hatası: ${errText}` }, { status: response.status });
    }

    // 3. Update local database immediately
    await supabase
      .from('marketplace_questions')
      .update({
        status: 'ANSWERED',
        answer_text: text,
        answer_date: new Date().toISOString()
      })
      .eq('id', questionId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}