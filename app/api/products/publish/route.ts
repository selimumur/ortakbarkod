import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createProductInWooCommerce } from '@/lib/woocommerce';
import { getOrganizationId } from "@/lib/accessControl";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { products, marketplace, accountId } = body;
    const orgId = await getOrganizationId();

    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    if (!products || !Array.isArray(products) || products.length === 0) {
        return NextResponse.json({ success: false, error: "Ürün listesi boş." }, { status: 400 });
    }

    // Initialize Supabase to log matches maybe?
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // --- WOOCOMMERCE PUBLISH ---
    // Check if marketplace name/platform implies Woo
    const isWoo = (marketplace && (
        marketplace.toLowerCase().includes('woo') ||
        marketplace.toLowerCase().includes('lilaby') ||
        marketplace.toLowerCase().includes('mobilya')
    ));

    if (isWoo) {
        console.log(`[Publish] Starting WooCommerce publish for ${products.length} items to Account: ${accountId || 'default'}`);

        for (const p of products) {
            try {
                // Prepare minimal payload for lib function
                const productData = {
                    id: p.id,
                    name: p.name,
                    description: p.description || p.name,
                    price: p.price || 0,
                    stock: p.stock || 0,
                    code: p.code,
                    sku: p.code,
                    image_url: p.image_url || p.images?.[0]
                };

                // Call Library Function
                // Pass accountId if available (frontend should send it)
                const wooRes = await createProductInWooCommerce(productData, accountId ? parseInt(accountId) : undefined);

                if (wooRes && wooRes.id) {
                    successCount++;
                    results.push({ id: p.id, status: 'success', remote_id: wooRes.id, message: 'Yayınlandı' });

                    // OPTIONAL: Automatically create a match in DB
                    await supabase.from('product_marketplace_matches').insert({
                        organization_id: orgId,
                        master_product_id: p.id,
                        marketplace: marketplace, // Store name or Platform?
                        remote_product_id: wooRes.id.toString(),
                        remote_variant_id: wooRes.id.toString(),
                        match_score: 100,
                        remote_data: wooRes
                    });

                } else {
                    failCount++;
                    results.push({ id: p.id, status: 'error', message: 'API yanıt vermedi' });
                }

            } catch (e: any) {
                console.error(`[Publish] Error for ${p.code}:`, e.message);
                failCount++;
                results.push({ id: p.id, status: 'error', message: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `${successCount} başarılı, ${failCount} hatalı.`,
            results
        });
    }

    // --- OTHER MARKETPLACES (Mock/Fallback) ---
    return NextResponse.json({
        success: false,
        error: "Bu pazaryeri için otomatik yayınlama henüz aktif değil. Sadece WooCommerce destekleniyor."
    }, { status: 400 });
}
