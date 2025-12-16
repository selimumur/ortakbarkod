'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";

// --- TYPES ---
export type Question = {
    id: number;
    text: string;
    customer_name: string;
    product_name: string;
    product_image?: string;
    web_url?: string;
    status: string;
    created_date: string;
    store_id: number;
    answer_text?: string;
    answer_date?: string;
    marketplace_accounts?: { store_name: string; platform: string; };
    raw_data?: any;
};

// --- HELPERS ---
const getTrendyolCredentials = (account: any) => {
    return {
        supplierId: account.supplier_id,
        apiKey: account.api_key,
        apiSecret: account.api_secret,
    };
};

function generateSyntheticId() {
    // Generate a secure random int64-ish
    // JS max safe int is 2^53. Postgres BigInt is 2^63.
    // We use a timestamp + random component to ensure uniqueness and order-ish
    // Date.now() ~ 13 digits. 
    // Random 6 digits.
    // Total 19 digits fits in BigInt?
    // Max safe JS integer is 9,007,199,254,740,991 (16 digits).
    // So we must be careful.
    // Let's use standard random 32-bit int if ID is just int. 
    // Assuming ID is BIGINT in DB.
    // Let's use: (TimeMs % 1000000000) * 1000 + Random(1000) -> 12-13 digits. Safe.
    const now = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return parseInt(`${now}${random}`.slice(0, 15)); // Limit to be safe for JS
}

// 1. Get Questions (Read DB)
export async function getQuestionsAction(storeId: string = "Tümü", statusTab: string = "Cevap Bekliyor") {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Start Query
    let query = supabase
        .from('marketplace_questions')
        .select(`
            *,
            marketplace_accounts!inner (
                store_name, platform
            )
        `)
        .eq('organization_id', orgId) // Strict Scope
        .order('created_date', { ascending: false });

    // Store Filter
    if (storeId !== "Tümü") {
        query = query.eq('store_id', storeId);
    }

    // Status Filter (Fixing the bug)
    // Map UI tabs to DB status
    if (statusTab === "Cevap Bekliyor") {
        query = query.in('status', ['WAITING_FOR_ANSWER', 'Cevap Bekliyor']);
    } else if (statusTab === "Cevaplandı") {
        query = query.in('status', ['ANSWERED', 'Cevaplandı']);
    } else if (statusTab === "Reddedildi") {
        query = query.in('status', ['REJECTED', 'Reddedildi']);
    } else if (statusTab === "Bildirildi") {
        query = query.in('status', ['REPORTED', 'Bildirildi']);
    }

    // Limit
    query = query.limit(100);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return data as any[];
}

// 2. Sync Questions (Fetch from Trendyol -> Save to DB Securely)
export async function syncQuestionsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // A. Get Accounts
    const { data: accounts, error: accountError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .ilike('platform', '%trendyol%');

    if (accountError || !accounts || accounts.length === 0) {
        return { success: false, message: 'Trendyol mağazası bulunamadı.' };
    }

    let totalSaved = 0;
    const errors: string[] = [];

    // B. Loop Accounts
    for (const account of accounts) {
        const { supplierId, apiKey, apiSecret } = getTrendyolCredentials(account);
        if (!supplierId || !apiKey || !apiSecret) {
            errors.push(`${account.store_name}: Eksik API bilgisi`);
            continue;
        }

        const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        const url = `https://apigw.trendyol.com/integration/qna/sellers/${supplierId}/questions/filter?supplierId=${supplierId}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'User-Agent': `${supplierId} - SelfIntegration`
                },
                next: { revalidate: 0 }
            });

            if (!response.ok) {
                const txt = await response.text();
                errors.push(`${account.store_name}: ${response.status} - ${txt}`);
                continue;
            }

            const data = await response.json();

            if (data && data.content && Array.isArray(data.content)) {
                for (const q of data.content) {
                    const remoteId = q.id;

                    // 1. Check if exists for THIS user
                    // Using raw_data->>id filter or remote_id concept
                    const { data: existing } = await supabase
                        .from('marketplace_questions')
                        .select('id')
                        .eq('organization_id', orgId)
                        // Casting raw_data to check id. 
                        // Note: Supabase JSON filtering:
                        .eq('raw_data->>id', String(remoteId))
                        .single();

                    // Determine DB ID
                    let dbId = existing ? existing.id : generateSyntheticId();

                    const questionData = {
                        id: dbId, // Use Synthetic or Existing
                        store_id: account.id,
                        organization_id: orgId, // CRITICAL
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
                        raw_data: q // Store full object to retrieve ID later
                    };

                    const { error: upsertError } = await supabase
                        .from('marketplace_questions')
                        .upsert(questionData, { onConflict: 'id' });

                    if (!upsertError) totalSaved++;
                    else {
                        // Collision on generated ID? Rare but retry once?
                        if (upsertError.message.includes('duplicate key')) {
                            questionData.id = generateSyntheticId();
                            await supabase.from('marketplace_questions').upsert(questionData);
                            totalSaved++;
                        } else {
                            console.error("Sync Upsert Error:", upsertError);
                        }
                    }
                }
            }
        } catch (e: any) {
            errors.push(`${account.store_name}: ${e.message}`);
        }
    }

    revalidatePath('/sorular');
    return {
        success: true,
        count: totalSaved,
        message: totalSaved > 0 ? `${totalSaved} soru güncellendi.` : (errors.length > 0 ? 'Hatalar oluştu.' : 'Yeni soru yok.'),
        warnings: errors
    };
}

// 3. Answer Question
export async function answerQuestionAction(payload: { questionId: number, text: string, storeId: number }) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const { questionId, text, storeId } = payload;
    if (!questionId || !text) throw new Error("Eksik bilgi");

    const supabase = getSupabaseAdmin();

    // A. Verify Account
    const { data: account } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('id', storeId)
        .eq('organization_id', orgId)
        .single();
    if (!account) throw new Error("Mağaza yetkisi yok.");

    // B. Get Remote ID from DB Question
    const { data: question } = await supabase
        .from('marketplace_questions')
        .select('raw_data')
        .eq('id', questionId)
        .eq('organization_id', orgId)
        .single();

    if (!question || !question.raw_data || !question.raw_data.id) {
        throw new Error("Soru kaynağı bulunamadı (Remote ID eksik).");
    }

    const remoteId = question.raw_data.id;

    // C. Send to Trendyol
    const { supplierId, apiKey, apiSecret } = getTrendyolCredentials(account);
    const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const url = `https://apigw.trendyol.com/integration/qna/sellers/${supplierId}/questions/${remoteId}/answers`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json',
                'User-Agent': `${supplierId} - SelfIntegration`
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Trendyol Hatası: ${txt}`);
        }

        // D. Update DB
        await supabase
            .from('marketplace_questions')
            .update({
                status: 'ANSWERED',
                answer_text: text,
                answer_date: new Date().toISOString()
            })
            .eq('id', questionId);

        revalidatePath('/sorular');
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 4. Get Accounts
export async function getAccountsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('marketplace_accounts').select('id, store_name, platform').eq('organization_id', orgId);
    return data || [];
}
