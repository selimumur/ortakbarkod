'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getOrganizationId } from "@/lib/accessControl";

async function getTenantId() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    return orgId;
}

export async function getProductsAction(
    page: number = 1,
    pageSize: number = 30,
    search?: string,
    filterType: string = 'all'
) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('master_products')
        .select('*', { count: 'exact' })
        .eq('organization_id', tenantId);

    if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    if (filterType === 'with_recipe') query = query.gt('cost_price', 0);
    else if (filterType === 'no_recipe') query = query.eq('cost_price', 0);
    else if (filterType === 'critical_stock') query = query.lt('stock', 5);
    else if (filterType === 'in_stock') query = query.gt('stock', 0);

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return { products: data, totalCount: count };
}

export async function upsertProductAction(productData: any, skipMarketplaceSync: boolean = false) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const payload = {
        ...productData,
        organization_id: tenantId
    };

    const isUpdate = payload.id && payload.id !== 'new';
    const productId = isUpdate ? payload.id : null;

    if (payload.id === 'new' || !payload.id) {
        delete payload.id;
    }

    const { data, error } = await supabase
        .from('master_products')
        .upsert(payload)
        .select()
        .single();

    if (error) throw new Error(error.message);

    // Sync to marketplaces if this is an update and sync is not skipped
    if (isUpdate && !skipMarketplaceSync && data) {
        try {
            const { syncProductToMarketplaceAction } = await import('./excelMatchingActions');

            // Prepare updates object with changed fields
            const updates: any = {};
            if (productData.sale_price !== undefined) updates.price = productData.sale_price;
            if (productData.stock !== undefined) updates.stock = productData.stock;
            if (productData.name !== undefined) updates.name = productData.name;
            if (productData.description !== undefined) updates.description = productData.description;
            if (productData.barcode !== undefined) updates.barcode = productData.barcode;

            // Sync in background (don't wait for it)
            if (Object.keys(updates).length > 0) {
                syncProductToMarketplaceAction(data.id, updates).catch(err => {
                    console.error('Marketplace sync error:', err);
                });
            }
        } catch (syncError) {
            console.error('Failed to sync to marketplace:', syncError);
            // Don't throw - product update succeeded, sync is optional
        }
    }

    revalidatePath('/urunler'); // Revalidate products page
    return data;
}

