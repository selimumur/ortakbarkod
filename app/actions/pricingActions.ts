'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
// import { auth } from "@clerk/nextjs/server"; // No longer needed for ID if we use helper
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";

// --- HELPERS ---
const getWooHeaders = (account: any) => {
    let baseUrl = account.base_url || account.store_url || account.url;
    if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    baseUrl = baseUrl?.replace(/\/$/, "");
    return {
        url: baseUrl,
        key: account.api_key,
        secret: account.api_secret
    }
};

const getTrendyolHeaders = (account: any) => ({
    supplierId: account.supplier_id,
    auth: Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64')
});

// 1. Get Products ready for Pricing Management
export async function getPricingProductsAction(search: string = "") {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    let query = supabase
        .from('master_products')
        .select(`
            id, name, code, barcode, stock, price, cost_price,
            product_marketplaces ( 
                id, marketplace_id, remote_product_id, current_sale_price, status,
                marketplace_accounts ( store_name, platform )
            )
        `)
        .eq('organization_id', orgId)
        .order('name');

    if (search && search.length > 0) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Transform
    return data?.map(p => ({
        ...p,
        matches: p.product_marketplaces?.map((m: any) => ({
            id: m.id,
            remote_product_id: m.remote_product_id,
            price: m.current_sale_price,
            marketplace: m.marketplace_accounts?.store_name || m.marketplace_accounts?.platform || '?',
            platform: m.marketplace_accounts?.platform,
            marketplace_id: m.marketplace_id
        })) || []
    })) || [];
}

// 2. Update Price (Local + Remote)
export async function updateProductPriceAction(payload: {
    matchId: number, // ID of product_marketplaces link
    newPrice: number
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const { matchId, newPrice } = payload;
    if (!matchId || !newPrice) throw new Error("Eksik veri.");

    const supabase = getSupabaseAdmin();

    // A. Fetch Link & Account Info securely
    const { data: link, error: linkErr } = await supabase
        .from('product_marketplaces')
        .select(`
            *,
            marketplace_accounts ( * )
        `)
        .eq('organization_id', orgId) // Securely isolated
        .eq('id', matchId)
        .single();

    if (linkErr || !link) throw new Error("Bağlantı bulunamadı.");

    const account = link.marketplace_accounts;
    const isWoo = account.platform.toLowerCase().includes('woo');
    const isTrendyol = account.platform.toLowerCase().includes('trendyol');

    // B. REMOTE UPDATE
    let success = false;
    let remoteError = null;

    if (isWoo) {
        const { url, key, secret } = getWooHeaders(account);
        const endpoint = `${url}/wp-json/wc/v3/products/${link.remote_product_id}?consumer_key=${key}&consumer_secret=${secret}`;

        try {
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regular_price: String(newPrice) })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error("WooCommerce Hatası: " + txt);
            }
            success = true;

        } catch (e: any) {
            remoteError = e.message;
        }

    } else if (isTrendyol) {
        const { supplierId, auth } = getTrendyolHeaders(account);
        // Trendyol Update Price Batch API
        const endpoint = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products/price-and-inventory`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'User-Agent': `${supplierId} - SelfIntegration`
                },
                body: JSON.stringify({
                    items: [{
                        barcode: link.barcode || link.remote_product_id, // Barcode preferred
                        salePrice: newPrice,
                        listPrice: newPrice
                    }]
                })
            });

            const json = await res.json();
            // Async batch usually returns batchRequestId
            if (json.batchRequestId) success = true;
            else {
                // If direct error
                throw new Error("Trendyol güncelleme reddedildi.");
            }

        } catch (e: any) {
            remoteError = e.message;
        }
    } else {
        // Mock success for unknown (or handle manual)
        success = true;
    }

    // C. LOCAL UPDATE
    // Even if remote fails, we might want to update local status to "error"
    // If success, update price

    const updateData: any = {
        last_success_date: new Date().toISOString()
    };

    if (success) {
        updateData.current_sale_price = newPrice;
        updateData.status = 'active'; // or synced
        updateData.last_error_message = null;
    } else {
        updateData.last_error_message = remoteError || "Bilinmeyen Hata";
        updateData.status = 'error';
    }

    const { error: upErr } = await supabase
        .from('product_marketplaces')
        .update(updateData)
        .eq('id', matchId)
        .eq('organization_id', orgId); // Extra safety

    if (upErr) throw new Error("Yerel güncelleme hatası: " + upErr.message);

    revalidatePath('/urunler/fiyatlama');

    if (!success) throw new Error("Pazaryeri güncellemesi başarısız: " + remoteError);

    return { success: true };
}
