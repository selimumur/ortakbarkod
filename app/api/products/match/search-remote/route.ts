import { NextRequest, NextResponse } from 'next/server';
import { getWooCommerceClient } from '@/lib/woocommerce';
// We import dynamically or use the lib helper we created
// import { searchTrendyolProducts } from '@/lib/trendyol'; // If we have fixed exports

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { query, marketplace, marketplaceId } = body;

    console.log(`[SearchRemote] Searching for '${query}' in '${marketplace}'...`);

    // --- 1. TRENDYOL SEARCH ---
    if (marketplace.toLowerCase().includes('trendyol')) {
        try {
            // Dynamically import to safely handle potential init errors
            const { searchTrendyolProducts } = await import('@/lib/trendyol');
            const tyResults = await searchTrendyolProducts(query);

            if (tyResults && tyResults.length > 0) {
                console.log(`[SearchRemote] Found ${tyResults.length} items in Trendyol.`);
                return NextResponse.json({ success: true, results: tyResults });
            }
        } catch (e: any) {
            console.error("[SearchRemote] Trendyol Error:", e.message);
        }
    }

    // --- 2. WOOCOMMERCE SEARCH ---
    // Try Woo if it's explicitly Woo OR if it matches known Woo store names
    // Or just try it as a fallback for "Lilaby Furniture" etc.
    const isWoo = marketplace.toLowerCase().includes('woo') ||
        marketplace.toLowerCase().includes('lilaby') ||
        marketplace.toLowerCase().includes('furniture') ||
        marketplace.toLowerCase().includes('mobilya');

    if (isWoo || !marketplace.toLowerCase().includes('trendyol')) {
        try {
            const wooClient = await getWooCommerceClient();
            if (wooClient) {
                const { data: wooProducts } = await wooClient.get("products", {
                    search: query,
                    per_page: 20
                });

                if (wooProducts && wooProducts.length > 0) {
                    console.log(`[SearchRemote] Found ${wooProducts.length} items in WooCommerce.`);
                    const results = wooProducts.map((p: any) => ({
                        id: p.id.toString(),
                        variantId: p.id.toString(),
                        title: p.name,
                        barcode: p.sku || "NO-SKU",
                        price: p.regular_price || p.price,
                        stock: p.stock_quantity || 0,
                        imageUrl: p.images && p.images.length > 0 ? p.images[0].src : null,
                        marketplace: "WooCommerce"
                    }));
                    return NextResponse.json({ success: true, results });
                }
            }
        } catch (e: any) {
            console.error("[SearchRemote] WooCommerce Error:", e.message);
        }
    }

    // --- FALLBACK MOCK ---
    // Only reachable if above searches return no results or error out.
    // We intentionally delay to simulate network feeling if it was instant fail.
    await new Promise(r => setTimeout(r, 500));

    const results = [
        {
            id: `MOCK-${Math.floor(Math.random() * 10000)}`,
            variantId: `VAR-${Math.floor(Math.random() * 10000)}`,
            title: `[MOCK / BULUNAMADI] ${marketplace}: "${query}"`,
            barcode: "0000",
            price: "0.00",
            stock: 0,
            imageUrl: null,
            marketplace: marketplace
        }
    ];

    return NextResponse.json({ success: true, results });
}
