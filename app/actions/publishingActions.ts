'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";
import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

// --- HELPERS ---
const getWooClient = (account: any) => {
    let baseUrl = account.base_url || account.store_url || account.url;
    if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    baseUrl = baseUrl?.replace(/\/$/, "");

    return new WooCommerceRestApi({
        url: baseUrl,
        consumerKey: account.api_key,
        consumerSecret: account.api_secret,
        version: "wc/v3"
    });
};

// 1. Get Products ready for publishing
export async function getProductsToPublishAction(page: number = 1, limit: number = 30, search: string = "", statusFilter: string = "all") {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('master_products')
        .select(`
            id, name, code, barcode, stock, price, image_url, description,
            product_marketplaces ( id, marketplace_id, remote_product_id )
        `, { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    // Transform / Filter in memory if needed for complex status logic
    // (e.g. "ready", "missing", "published")
    // Simple UI checks are enough usually, but let's pass data clean.

    // Check "matches" compatibility for UI
    const products = data?.map(p => ({
        ...p,
        matches: p.product_marketplaces
    })) || [];

    return {
        products,
        total: count || 0
    };
}

// 2. Publish Products Logic
export async function publishProductsAction(payload: {
    products: any[],
    marketplaceId: string, // Account ID
    marketplaceName: string // For logging/UI
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const { products, marketplaceId } = payload;
    if (!products || products.length === 0) throw new Error("Ürün seçilmedi.");

    const supabase = getSupabaseAdmin();

    // A. Verify Account & Get Config
    const { data: account, error: accError } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('id', parseInt(marketplaceId))
        .eq('organization_id', orgId)
        .single();

    if (accError || !account) throw new Error("Mağaza bulunamadı veya erişim yetkisi yok.");

    // B. Check Platform Support
    const isWoo = account.platform.toLowerCase().includes('woo');
    if (!isWoo) {
        // Mock success for Trendyol if not strictly implemented yet, or throw
        throw new Error("Otomatik ürün gönderimi şu an sadece WooCommerce için aktiftir.");
    }

    // C. Initialize Woo Client
    let api;
    try {
        api = getWooClient(account);
    } catch (e) {
        throw new Error("WooCommerce bağlantı ayarları hatalı.");
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // D. Process Loop
    for (const p of products) {
        try {
            // Check if already linked to THIS account?
            // (Client side usually checks visual indicator, but double check good practice)

            // Prepare Payload
            const productData = {
                name: p.name,
                type: "simple",
                regular_price: p.price?.toString() || "0",
                description: p.description || "",
                short_description: p.code || "",
                sku: p.code || `OB-${p.id}`,
                manage_stock: true,
                stock_quantity: p.stock || 0,
                // images: p.image_url ? [{ src: p.image_url }] : [] 
                // Images might need full URL, check if p.image_url is valid
            };
            if (p.image_url && p.image_url.startsWith('http')) {
                // @ts-ignore
                productData.images = [{ src: p.image_url }];
            }

            // --- WOO CREATE CALL ---
            // First check by SKU to avoid dupes?
            let wooId = null;
            let wooRes = null;

            try {
                // Check exist
                if (productData.sku) {
                    const check = await api.get("products", { sku: productData.sku });
                    if (check.data && check.data.length > 0) {
                        wooId = check.data[0].id;
                        wooRes = check.data[0];
                    }
                }
            } catch (ignore) { }

            if (!wooId) {
                // Create
                const response = await api.post("products", productData);
                wooId = response.data.id;
                wooRes = response.data;
            }

            if (wooId) {
                successCount++;
                results.push({ id: p.id, status: 'success', remote_id: wooId, message: 'Yayınlandı' });

                // LINK IN DB
                // Check if link exists
                const { data: existingLink } = await supabase
                    .from('product_marketplaces')
                    .select('id')
                    .eq('product_id', p.id)
                    .eq('marketplace_id', account.id)
                    .single();

                if (!existingLink) {
                    await supabase.from('product_marketplaces').insert({
                        product_id: p.id,
                        marketplace_id: account.id,
                        remote_product_id: String(wooId),
                        remote_variant_id: String(wooId),
                        status: 'active',
                        current_sale_price: parseFloat(wooRes.price || productData.regular_price),
                        stock_quantity: parseInt(wooRes.stock_quantity || productData.stock_quantity)
                    });
                }
            } else {
                throw new Error("WooCommerce ID dönmedi.");
            }

        } catch (e: any) {
            console.error(`Publish Error ${p.code}:`, e.response?.data || e.message);
            failCount++;
            results.push({ id: p.id, status: 'error', message: e.message });
        }
    }

    revalidatePath('/urunler/yayinla');
    return {
        success: true,
        message: `${successCount} başarılı, ${failCount} hatalı.`,
        results
    };
}
