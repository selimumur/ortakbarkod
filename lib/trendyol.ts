import { createClient } from '@supabase/supabase-js';

// Supabase Admin Helper
function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase URL/Key missing");
    return createClient(url, key);
}

export async function getTrendyolConfig(accountId?: number) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('marketplace_accounts').select('*').eq('platform', 'Trendyol').eq('is_active', true);

    if (accountId) query = query.eq('id', accountId);

    const { data: config, error } = await query.maybeSingle(); // or .limit(1) and handle list?

    // If multiple Trendyol accounts, maybeSingle() might fail if not filtered by ID.
    // So if no ID, we should probably fetch the first one.
    if (!accountId) {
        const { data: configs } = await supabase.from('marketplace_accounts').select('*').eq('platform', 'Trendyol').eq('is_active', true).limit(1);
        if (configs && configs.length > 0) return configs[0];
    }

    if (!config) return null;
    return config;
}

export async function searchTrendyolProducts(query: string, accountId?: number) {
    const config = await getTrendyolConfig(accountId);
    if (!config) throw new Error("Trendyol account not found");

    const { supplier_id, api_key, api_secret } = config;
    const auth = Buffer.from(`${api_key}:${api_secret}`).toString("base64");

    // Trendyol API: Filter by Barcode or StockCode is most reliable.
    // Searching by Title is not directly supported via API as a simple 'q' parameter.
    // We have to list products and filter? Listing all is expensive.
    // HOWEVER, we can try filtering by barcode if the query looks like one, or approved status.

    // Strategy: 
    // 1. If query is barcode-like (numbers), try ?barcode={query}
    // 2. If query is text, we can't search title easily remotely. 
    //    But we can fetch a page of products (size=50) and filter in memory? 
    //    Or just return "Only Barcode Search Supported for Trendyol" message if possible?
    //    Actually, effectively we need to support title search.
    //    Let's fetch recent products or "approved" products and filter. Limits are real.

    const isBarcode = /^\d+$/.test(query);
    let url = `https://api.trendyol.com/sapigw/suppliers/${supplier_id}/products?size=50`;

    if (isBarcode) {
        url += `&barcode=${query}`;
    }
    // No title search param in official API docs for Suppliers? 
    // Usually it is ?barcode=... or ?stockCode=...

    // Let's try fetching and filtering manually if not barcode.

    const res = await fetch(url, {
        headers: {
            "Authorization": `Basic ${auth}`,
            "User-Agent": `${supplier_id} - SelfIntegration`
        }
    });

    if (!res.ok) {
        const txt = await res.text();
        console.error("Trendyol API Error:", txt);
        throw new Error("Trendyol API request failed");
    }

    const json = await res.json();
    let items = json.content || [];

    if (!isBarcode) {
        // Manual filter by title if we fetched a list
        const lowerQ = query.toLowerCase();
        items = items.filter((p: any) =>
            p.title.toLowerCase().includes(lowerQ) ||
            p.productCode.toLowerCase().includes(lowerQ)
        );
    }

    return items.map((p: any) => ({
        id: p.productContentId || p.stockCode,
        variantId: p.productCode || p.stockCode, // Merchant SKU
        title: p.title,
        barcode: p.barcode,
        price: p.listPrice, // or salePrice
        stock: p.quantity,
        imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null,
        marketplace: "Trendyol"
    }));
}
