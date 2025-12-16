'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
// import { auth } from "@clerk/nextjs/server"; // No longer needed for ID if we use helper
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";

// --- HELPERS ---
const getTrendyolCredentials = (account: any) => ({
    supplierId: account.supplier_id,
    apiKey: account.api_key,
    apiSecret: account.api_secret,
});

// 1. Get Matching Products (Master Products with their Links)
export async function getMatchingProductsAction(search: string = "", filter: string = "all") {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Fetch products
    let query = supabase
        .from('master_products')
        .select(`
            id, name, code, barcode,
            product_marketplaces (
                id, remote_product_id, marketplace_id,
                marketplace_accounts ( store_name, platform )
            )
        `)
        .eq('organization_id', orgId)
        .order('name');

    // Apply Search
    if (search && search.trim().length > 0) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) throw new Error(error.message);

    // Filter Logic & Transform
    let result = products || [];

    // Filter based on presence of matches
    if (filter === 'matched') {
        result = result.filter(p => p.product_marketplaces && p.product_marketplaces.length > 0);
    } else if (filter === 'unmatched') {
        result = result.filter(p => !p.product_marketplaces || p.product_marketplaces.length === 0);
    }

    // Transform for UI (Flatten marketplace info)
    return result.map(p => ({
        ...p,
        matches: p.product_marketplaces?.map((m: any) => ({
            id: m.id,
            remote_product_id: m.remote_product_id,
            marketplace: m.marketplace_accounts?.store_name || m.marketplace_accounts?.platform || 'Bilinmiyor',
            marketplace_id: m.marketplace_id
        })) || []
    }));
}


// 2. Search Remote Products (API Call)
export async function searchRemoteProductsAction(marketplaceName: string, query: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    if (!query || query.length < 3) return [];

    const supabase = getSupabaseAdmin();

    // A. Get Account
    const { data: account } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('organization_id', orgId)
        .or(`store_name.eq.${marketplaceName}, platform.eq.${marketplaceName}`)
        .limit(1)
        .single();

    if (!account) throw new Error("Mağaza bulunamadı.");

    let results = [];

    // B. TRENDYOL
    if (account.platform.toLowerCase().includes('trendyol')) {
        const { supplierId, apiKey, apiSecret } = getTrendyolCredentials(account);
        const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        // Trendyol: Filter by Barcode if numeric, otherwise try fetching allow-listed set
        // API V2 filtering is limited.

        let fetchUrl = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products?size=20&approved=true`;
        if (/^\d+$/.test(query)) {
            fetchUrl += `&barcode=${query}`;
        }

        try {
            const res = await fetch(fetchUrl, {
                headers: { 'Authorization': `Basic ${authHeader}` },
                next: { revalidate: 60 }
            });
            if (!res.ok) throw new Error("Trendyol API Hatası: " + res.status);

            const json = await res.json();
            if (json && json.content) {
                results = json.content.map((p: any) => ({
                    id: p.productContentId || p.productMainId,
                    platform: 'Trendyol',
                    title: p.title,
                    barcode: p.barcode,
                    imageUrl: p.images && p.images.length > 0 ? p.images[0].url : null,
                    price: p.salePrice || p.listPrice,
                    stock: p.quantity,
                    variantId: p.productContentId,
                    raw_data: p
                }));
            }

            // Client-side text filter if not barcode search
            if (!/^\d+$/.test(query)) {
                const qLower = query.toLowerCase();
                results = results.filter((p: any) => p.title.toLowerCase().includes(qLower));
            }

        } catch (e: any) {
            throw new Error("Trendyol Hatası: " + e.message);
        }
    }
    // C. WOOCOMMERCE
    else if (account.platform.toLowerCase().includes('woo')) {
        let baseUrl = account.base_url || account.store_url || account.url;
        if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

        // Woo has `search` param
        const url = `${baseUrl}/wp-json/wc/v3/products?search=${query}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("WooConnect Hatası");
            const json = await res.json();
            if (Array.isArray(json)) {
                results = json.map((p: any) => ({
                    id: p.id,
                    platform: 'WooCommerce',
                    title: p.name,
                    barcode: p.sku,
                    imageUrl: p.images && p.images.length > 0 ? p.images[0].src : null,
                    price: p.price,
                    stock: p.stock_quantity,
                    variantId: p.id,
                    raw_data: p
                }));
            }
        } catch (e: any) {
            throw new Error("WooCommerce Bağlantı Hatası: " + e.message);
        }
    }

    return results;
}

// 3. Match (Link) Product
export async function matchProductAction(payload: {
    master_product_id: number,
    marketplace: string, // Store Name
    remote_product_id: string,
    remote_variant_id?: string,
    remote_data?: any
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Find Account ID from Name
    const { data: account } = await supabase
        .from('marketplace_accounts')
        .select('id, store_name, platform')
        .eq('organization_id', orgId)
        .eq('store_name', payload.marketplace)
        .single();

    if (!account) throw new Error("Mağaza bulunamadı.");

    const linkData = {
        organization_id: orgId,
        product_id: payload.master_product_id,
        marketplace_id: account.id,
        // marketplace: account.store_name, // REMOVED: Column does not exist
        remote_product_id: String(payload.remote_product_id),
        remote_variant_id: payload.remote_variant_id ? String(payload.remote_variant_id) : null,
        barcode: payload.remote_data?.barcode || null,
        current_sale_price: payload.remote_data?.price || 0,
        stock_quantity: payload.remote_data?.stock || 0,
        status: 'active',
        is_owner: true
    };

    const { error } = await supabase.from('product_marketplaces').insert(linkData);

    if (error) throw new Error(error.message);
    revalidatePath('/urunler/eslestirme');
    return { success: true };
}

// 4. Unmatch
export async function unmatchProductAction(matchId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('product_marketplaces')
        .delete()
        .eq('id', matchId)
        .eq('organization_id', orgId); // Added extra safety

    if (error) throw new Error(error.message);

    revalidatePath('/urunler/eslestirme');
    return { success: true };
}
