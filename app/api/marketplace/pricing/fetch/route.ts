
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from '@clerk/nextjs/server';
import { getOrganizationId } from "@/lib/accessControl";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { marketplaceId, page = 1 } = await request.json();
        const orgId = await getOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!marketplaceId) {
            return NextResponse.json({ error: 'Marketplace ID required' }, { status: 400 });
        }

        // Use standard Admin Client
        const supabase = getSupabaseAdmin();

        // 1. Get Marketplace Account (Secured)
        const { data: account, error: accountError } = await supabase
            .from('marketplace_accounts')
            .select('*')
            .eq('id', marketplaceId)
            .eq('organization_id', orgId) // Changed from orgId to userId to match rest of app
            .single();

        if (accountError || !account) throw new Error('Mağaza bulunamadı veya yetkiniz yok!');

        let totalUpdated = 0;
        let hasMore = false;
        const BATCH_SIZE = 50;

        // 2. Fetch Logic Based on Platform
        // NOTE: Keeping the previous logic but ensuring checks use userId
        if (account.platform.toLowerCase().includes('trendyol')) {
            try {
                const trendyolPage = Math.max(0, page - 1);
                const authHeader = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');
                const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/products?size=${BATCH_SIZE}&page=${trendyolPage}`;

                const res = await fetch(url, {
                    headers: { 'Authorization': `Basic ${authHeader}` }
                });

                if (!res.ok) {
                    if (res.status === 403) throw new Error(`Yetki Hatası (403): Satıcı ID ve API Anahtarlarını kontrol edin.`);
                    throw new Error(`Trendyol API Hatası: ${res.status}`);
                }
                const data = await res.json();
                const products = data.content || [];

                hasMore = products.length === BATCH_SIZE;

                for (const p of products) {
                    const barcode = p.barcode;

                    // Match (Secured)
                    const { data: masterProd } = await supabase
                        .from('master_products')
                        .select('id')
                        .eq('code', barcode)
                        .eq('organization_id', orgId) // Secured
                        .single();

                    if (masterProd) {
                        await supabase.from('product_marketplaces').upsert({
                            product_id: masterProd.id,
                            marketplace_id: account.id,
                            remote_product_id: p.productContentId || p.productMainId,
                            barcode: barcode,
                            current_sale_price: p.salePrice,
                            discounted_price: p.listPrice,
                            stock_quantity: p.quantity,
                            status: (p.approved && !p.locked) ? 'Active' : 'Passive',
                            last_price_check_at: new Date().toISOString(),
                            organization_id: orgId // Ensure ownership
                        }, { onConflict: 'product_id, marketplace_id' });
                        totalUpdated++;
                    }
                }
            } catch (e: any) { throw new Error(`Trendyol API Err: ${e.message}`); }
        }
        else if (account.platform.toLowerCase().includes('woo')) {
            try {
                let baseStoreUrl = account.base_url || account.store_url || account.url;
                if (baseStoreUrl && !baseStoreUrl.startsWith('http')) baseStoreUrl = 'https://' + baseStoreUrl;
                baseStoreUrl = baseStoreUrl?.replace(/\/$/, "");

                if (!baseStoreUrl) throw new Error("Store URL eksik");

                // Woo is 1-indexed
                const wooPage = page;
                const url = `${baseStoreUrl}/wp-json/wc/v3/products?per_page=${BATCH_SIZE}&page=${wooPage}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`WooCommerce API Hatası: ${res.status}`);
                const products = await res.json();

                if (Array.isArray(products)) {
                    hasMore = products.length === BATCH_SIZE;

                    for (const p of products) {
                        const sku = p.sku;

                        // Match (Secured)
                        const { data: masterProd } = await supabase
                            .from('master_products')
                            .select('id')
                            .eq('code', sku)
                            .eq('organization_id', orgId) // Secured
                            .single();

                        if (masterProd) {
                            await supabase.from('product_marketplaces').upsert({
                                product_id: masterProd.id,
                                marketplace_id: account.id,
                                remote_product_id: String(p.id),
                                barcode: sku,
                                current_sale_price: parseFloat(p.price || p.regular_price || "0"),
                                stock_quantity: p.stock_quantity || 0,
                                status: p.status === 'publish' ? 'Active' : 'Passive',
                                last_price_check_at: new Date().toISOString(),
                                organization_id: orgId // Ensure ownership
                            }, { onConflict: 'product_id, marketplace_id' });
                            totalUpdated++;
                        }
                    }
                } else { hasMore = false; }
            } catch (e: any) { throw new Error(`Woo API Err: ${e.message}`); }
        }

        return NextResponse.json({
            success: true,
            updated: totalUpdated,
            hasMore: hasMore,
            pageProcessed: page
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
