'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

// 1. Get Marketplaces
export async function getMarketplacesAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('organization_id', orgId); // Scoped to organization_id (userId)

    if (error) throw new Error(error.message);
    return data || [];
}

// 2. Get Products with Integrations
export async function getMarketplaceProductsAction(page: number = 1, pageSize: number = 30, search: string = "", stockFilter: string = "all") {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('master_products')
        .select(`
            id, name, code, stock, price, cost_price, image_url,
            product_marketplaces (
                id, marketplace_id, current_sale_price, status, stock_quantity, sync_status, remote_product_id, barcode, last_error_message
            )
        `, { count: 'exact' })
        .eq('organization_id', orgId) // Scoped
        .range(from, to)
        .order('created_at', { ascending: false });

    // Apply Search
    if (search && search.length > 0) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    // Apply Stock Filter
    if (stockFilter === 'critical') {
        query = query.lt('stock', 5);
    } else if (stockFilter === 'out') {
        query = query.eq('stock', 0);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
        products: data,
        totalCount: count || 0
    };
}
