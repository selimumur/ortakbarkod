'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";
import { revalidatePath } from "next/cache";

// Reuse other actions if needed, or implement direct logic for bulk due to performance
import { updateProductPriceAction } from "./pricingActions"; // Reuse single update logic if possible? 
// Single update might be slow for bulk. Bulk should probably use batched API calls if possible, or loop server side.
// For now, loop server side is better than client side.

// 1. Bulk Update
export async function bulkUpdatePricesAction(payload: {
    sourceMarketId: string, // 'base_price' or market ID
    targetMarketId: number,
    operation: 'copy' | 'inc_percent' | 'dec_percent',
    value: number
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const { sourceMarketId, targetMarketId, operation, value } = payload;
    if (!targetMarketId) throw new Error("Hedef Pazar Seçilmedi");

    const supabase = getSupabaseAdmin();

    // A. Fetch All Products that have connection to Target
    // We need to fetch products.
    // Optimization: Fetch only necessary fields.
    const { data: products, error } = await supabase
        .from('master_products')
        .select(`
            id, price,
            product_marketplaces ( id, marketplace_id, current_sale_price, remote_product_id )
        `)
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    if (!products || products.length === 0) return { success: true, count: 0 };

    let count = 0;
    const errors = [];

    // B. Loop and Update
    // Note: This might timeout for 1000+ products on Vercel (10-60s limit).
    // For Vercel, we should probably limit this to e.g. 50 items or use a queue.
    // For this refactor, I will implement a loop but user should be aware of limits.
    // Or we filter to only matches.

    for (const p of products) {
        const targetMatch = p.product_marketplaces?.find((pm: any) => pm.marketplace_id === targetMarketId);
        if (!targetMatch) continue; // Skip if not linked

        let basePrice = 0;
        if (sourceMarketId === 'base_price') {
            basePrice = p.price;
        } else {
            const sourceMatch = p.product_marketplaces?.find((pm: any) => pm.marketplace_id === Number(sourceMarketId));
            if (sourceMatch) basePrice = sourceMatch.current_sale_price;
        }

        if (!basePrice || basePrice <= 0) continue;

        let newPrice = basePrice;
        if (operation === 'inc_percent') newPrice = basePrice * (1 + (value / 100));
        else if (operation === 'dec_percent') newPrice = basePrice * (1 - (value / 100));

        newPrice = Math.round(newPrice * 100) / 100;

        // Skip if price hasn't changed? 
        if (newPrice === targetMatch.current_sale_price) continue;

        try {
            await updateProductPriceAction({ matchId: targetMatch.id, newPrice });
            count++;
        } catch (e: any) {
            errors.push({ id: p.id, error: e.message });
        }
    }

    revalidatePath('/pazaryeri/fiyatlandirma');
    return { success: true, count, errors };
}

// 2. Manual Link
export async function manualLinkAction(payload: {
    productId: number,
    marketplaceId: number,
    remoteId: string,
    remoteInitialPrice: number
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Check if already exists
    const { data: exist } = await supabase
        .from('product_marketplaces')
        .select('id')
        .eq('product_id', payload.productId)
        .eq('marketplace_id', payload.marketplaceId)
        .single();

    if (exist) throw new Error("Bu ürün zaten bu pazaryerine bağlı.");

    const { error } = await supabase.from('product_marketplaces').insert({
        organization_id: orgId,
        product_id: payload.productId,
        marketplace_id: payload.marketplaceId,
        remote_product_id: payload.remoteId,
        remote_variant_id: payload.remoteId,
        current_sale_price: payload.remoteInitialPrice || 0,
        status: 'active'
    });

    if (error) throw new Error(error.message);
    revalidatePath('/pazaryeri/fiyatlandirma');
    return { success: true };
}
