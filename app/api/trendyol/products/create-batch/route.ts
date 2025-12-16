import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { getOrganizationId } from "@/lib/accessControl";

export async function POST(request: Request) {
    try {
        const { productIds, accountId, categoryId } = await request.json();

        if (!productIds || !productIds.length || !accountId) {
            return NextResponse.json({ success: false, error: "Eksik parametreler" }, { status: 400 });
        }

        const orgId = await getOrganizationId();
        if (!orgId) {
            return NextResponse.json({ success: false, error: "Yetkisiz Erişim" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Get Account Info & Settings
        const [accountRes, settingsRes] = await Promise.all([
            supabase.from('marketplace_accounts').select('*').eq('id', accountId).eq('organization_id', orgId).single(),
            supabase.from('factory_settings').select('default_brand_id').eq('organization_id', orgId).single()
        ]);

        const account = accountRes.data;
        const settings = settingsRes.data;

        if (!account || !account.api_key) {
            return NextResponse.json({ success: false, error: "Mağaza bilgileri bulunamadı" }, { status: 404 });
        }

        // 2. Get Products
        const { data: products } = await supabase
            .from('master_products')
            .select('*')
            .in('id', productIds)
            .eq('organization_id', orgId);

        if (!products || products.length === 0) {
            return NextResponse.json({ success: false, error: "Ürünler bulunamadı" }, { status: 404 });
        }

        // 3. Prepare Trendyol Payload
        const items = products.map((p: any) => {
            // Validation
            if (!p.barcode) return null; // Skip invalid

            // Basic Attribute Mapping (Minimal)
            // For furniture, Desi is critical. 
            // In V2, attributes are array of {attributeId, attributeValueId}
            // But for simple listing we often need criticals.
            // If Category ID is provided, we use it. 
            // NOTE: This is a "Naive" implementation. Real V2 requires strict ID mapping.
            // We will hope the category allows free text or some defaults, or this will fail and return error report.

            const attributes: any[] = [];
            // Example: If user has 'Color' in some local field, we'd map it here.

            return {
                barcode: p.barcode,
                title: p.name,
                productMainId: p.code, // Model Code
                brandId: (p as any).brand_id || settings?.default_brand_id || 1791,
                // TODO: Real implementation needs Brand Search.
                categoryId: categoryId ? parseInt(categoryId) : 419, // Default to a generic category if none? No, bad idea.
                quantity: p.stock,
                stockCode: p.code,
                dimensionalWeight: p.total_desi || 1, // Desi
                description: p.description || "",
                currencyType: "TRY",
                listPrice: p.price,
                salePrice: p.price,
                vatRate: p.vat_rate || 20,
                cargoCompanyId: 10, // Default Cargo (Yurtiçi etc) - Needs mapping
                images: p.images?.map((url: string) => ({ url })) || [],
                attributes: attributes
            };
        }).filter(Boolean);

        if (items.length === 0) {
            return NextResponse.json({ success: false, error: "Geçerli (barkodu olan) ürün bulunamadı." }, { status: 400 });
        }

        // 4. Send to Trendyol V2
        const basicAuth = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');
        const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/v2/products`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
                'User-Agent': `${account.supplier_id} - SelfIntegration`
            },
            body: JSON.stringify({ items })
        });

        const result = await response.json();

        if (response.ok) {
            return NextResponse.json({
                success: true,
                batchRequestId: result.batchRequestId,
                message: `${items.length} ürün kuyruğa alındı. Batch ID: ${result.batchRequestId}`
            });
        } else {
            console.error("Trendyol Error:", result);
            // Handle Validation Errors
            return NextResponse.json({ success: false, error: "Trendyol Hatası", details: result }, { status: 400 });
        }

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
