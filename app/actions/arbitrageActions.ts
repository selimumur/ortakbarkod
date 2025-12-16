'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// --- TYPES ---
export interface ArbitrageOpportunity {
    id: string;
    product_name: string;
    source_market: string;
    target_market: string;
    source_price: number;
    target_price: number;
    profit_amount: number;
    profit_margin: number;
    risk_score: number;
    status: string;
    created_at: string;
}

export interface WatchlistItem {
    id: string;
    product_name: string;
    market_name: string;
    target_price: number;
    current_price: number;
    stock_status: string;
    notes?: string;
    currency?: string;
    product_url?: string;
    image_url?: string;
    created_at: string;
}

// --- ACTIONS ---

/**
 * Global Arbitrage Opportunities (Read-Only for Users)
 * These are system-generated and shared across tenants.
 */
// --- ACTIONS ---

/**
 * Global Arbitrage Opportunities (Read-Only for Users)
 * These are system-generated and shared across tenants.
 */
export async function getArbitrageOpportunitiesAction() {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Yetkisiz Erişim" };

    const supabase = getSupabaseAdmin();

    try {
        const { data, error } = await supabase
            .from('arbitrage_opportunities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        return { success: true, data: data as ArbitrageOpportunity[] };
    } catch (error: any) {
        console.error("Arbitrage Error:", error);
        return { success: false, error: 'Fırsatlar yüklenirken hata oluştu.' };
    }
}

/**
 * Tenant Specific Watchlist
 * Isolated by organization_id
 */
export async function getWatchlistAction() {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Yetkisiz Erişim" };

    const supabase = getSupabaseAdmin();

    try {
        const { data, error } = await supabase
            .from('arbitrage_watchlist')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data as WatchlistItem[] };
    } catch (error: any) {
        console.error("Watchlist Error:", error);
        return { success: false, error: 'İzleme listesi yüklenemedi.' };
    }
}

/**
 * Add Item to Watchlist
 */
export async function addToWatchlistAction(data: Partial<WatchlistItem>) {
    const { orgId, userId } = await auth();
    if (!orgId) return { success: false, error: "Yetkisiz Erişim" };

    const supabase = getSupabaseAdmin();

    try {
        const { error } = await supabase
            .from('arbitrage_watchlist')
            .insert({
                ...data,
                organization_id: orgId,
            });

        if (error) throw error;

        revalidatePath('/arbitraj/izleme-listesi');
        return { success: true };
    } catch (error: any) {
        console.error("Add Watchlist Error:", error);
        return { success: false, error: 'Ekleme başarısız.' };
    }
}

/**
 * Remove from Watchlist
 */
export async function removeFromWatchlistAction(id: string) {
    const { orgId } = await auth();
    if (!orgId) return { success: false, error: "Yetkisiz Erişim" };

    const supabase = getSupabaseAdmin();

    try {
        const { error } = await supabase
            .from('arbitrage_watchlist')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId);

        if (error) throw error;

        revalidatePath('/arbitraj/izleme-listesi');
        return { success: true };
    } catch (error: any) {
        console.error("Remove Watchlist Error:", error);
        return { success: false, error: 'Silme başarısız.' };
    }
}

/**
 * Convert Watchlist Item to Product
 */
export async function createProductFromArbitrageAction(watchlistId: string) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // 1. Get Watchlist Item
    const { data: item, error: fetchError } = await supabase
        .from('arbitrage_watchlist')
        .select('*')
        .eq('id', watchlistId)
        .eq('organization_id', orgId)
        .single();

    if (fetchError || !item) throw new Error("Ürün bulunamadı.");

    // 2. Create Product
    const { data: product, error: insertError } = await supabase
        .from('master_products')
        .insert({
            organization_id: orgId,
            name: item.product_name,
            code: `ARB-${Date.now().toString().slice(-6)}`,
            price: item.current_price,
            market_price: item.current_price,
            product_url: item.product_url,
            image_url: item.image_url,
            images: item.image_url ? [item.image_url] : [],
            description: `Arbitraj listesinden eklendi. Kaynak: ${item.market_name}`,
            category: "Arbitraj",
            brand: item.market_name,
            stock: 0,
            cost_price: item.current_price,
            vat_rate: 20
        })
        .select()
        .single();

    if (insertError) throw new Error(insertError.message);

    revalidatePath('/urunler');
    return { success: true, productId: product.id };
}
