'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

export async function getOrdersAction(
    page: number = 0,
    pageSize: number = 20,
    storeId: string = "Tümü",
    activeTab: string = "Yeni",
    search: string = ""
) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    let query = supabase.from('orders').select('*', { count: 'exact' });

    // Updated: orders uses organization_id
    query = query.eq('organization_id', orgId);

    // A. Store Filter
    if (storeId !== "Tümü") {
        if (storeId === 'MANUAL') {
            query = query.eq('is_manual', true);
        } else {
            // Ensure storeId is a number if column is bigint, or rely on implicit casting if safe.
            // But if storeId came as 'MANUAL' we handled it above.
            query = query.eq('store_id', storeId);
        }
    }

    // B. Status Filter
    if (activeTab !== "Tümü") {
        if (activeTab === "İptal/İade") {
            query = query.in('status', ["İptal", "İade", "Cancelled", "Returned", "UnDelivered", "Rejected", "UnSupplied"]);
        } else {
            query = query.eq('status', activeTab);
        }
    }

    // C. Search Filter
    if (search.length > 2) {
        query = query.or(`order_number.ilike.%${search}%, customer_name.ilike.%${search}%`);
    }

    // D. Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.order('order_date', { ascending: false }).range(from, to);

    if (error) throw new Error(error.message);

    return { orders: data, totalCount: count };
}

export async function getAccountsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // marketplaces has user_id, verified.
    const { data, error } = await supabase.from('marketplace_accounts').select('*').eq('organization_id', orgId).order('created_at');

    if (error) throw new Error(error.message);
    return data;
}

export async function deleteOrderAction(orderId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('orders').delete().eq('id', orderId).eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    return { success: true };
}

export async function getParcelsForExportAction(productCodes: string[]) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    if (!productCodes.length) return {};

    const supabase = getSupabaseAdmin();
    // master_products has user_id, verified.
    // product_parcels is related to master_products.
    // We select products and their parcels.

    const { data: products, error } = await supabase
        .from('master_products')
        .select('code, product_parcels(width, height, depth, weight, desi)')
        .eq('organization_id', orgId)
        .in('code', productCodes);

    if (error) throw new Error(error.message);

    const parcelMap: Record<string, any[]> = {};
    if (products) {
        products.forEach((p: any) => {
            if (p.product_parcels && p.product_parcels.length > 0) {
                parcelMap[p.code] = p.product_parcels;
            }
        });
    }
    return parcelMap;
}

// --- MANUAL ORDER ACTIONS ---

export async function searchProductsForOrderAction(search: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();
    // master_products has user_id
    const { data, error } = await supabase
        .from('master_products')
        .select('id, name, code, stock, price, image_url')
        .eq('organization_id', orgId)
        .or(`name.ilike.%${search}%,code.ilike.%${search}%`)
        .limit(20);

    if (error) throw new Error(error.message);
    return data;
}

export async function getManualOrderAction(orderId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).eq('organization_id', orgId).single();
    if (error) throw new Error(error.message);
    return data;
}

export async function saveManualOrderAction(payload: any, isEdit: boolean) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // 1. Save/Update Order
    let orderId = payload.id;
    let orderResult;

    if (isEdit && orderId) {
        // Update
        const { data, error } = await supabase.from('orders').update({
            ...payload.orderData,
            organization_id: orgId // ensure ownership
        }).eq('id', orderId).eq('organization_id', orgId).select().single();
        if (error) throw new Error("Update Error: " + error.message);
        orderResult = data;
    } else {
        // Insert
        // cleanup id if it exists but is 0 or null
        const insertData = { ...payload.orderData, organization_id: orgId };
        delete insertData.id;

        const { data, error } = await supabase.from('orders').insert(insertData).select().single();
        if (error) throw new Error("Insert Error: " + error.message);
        orderResult = data;
        orderId = data.id;
    }

    // 2. Handle Stock Updates
    // We need to handle stock changes.
    // If Edit: Revert original stock, then deduct new stock.
    // If New: Deduct new stock.

    // Note: To do this safely, we need the diff.
    // Payload should contain `cart` and `originalCart`.

    const cart = payload.cart || [];
    const originalCart = payload.originalCart || [];

    // Revert Original Cart (Add back to stock)
    if (isEdit && originalCart.length > 0) {
        for (const item of originalCart) {
            if (item.productId) {
                // Fetch current stock to be safe? Or atomic increment?
                // Supabase rpc is best for atomic, but simple read-write is okay for now if not high concurrency.
                const { data: prod } = await supabase.from('master_products').select('stock').eq('id', item.productId).single();
                if (prod) {
                    await supabase.from('master_products').update({ stock: prod.stock + item.quantity }).eq('id', item.productId);
                }
            }
        }
    }

    // Deduct New Cart
    if (cart.length > 0) {
        for (const item of cart) {
            if (item.productId) {
                const { data: prod } = await supabase.from('master_products').select('stock').eq('id', item.productId).single();
                if (prod) {
                    const newStock = Math.max(0, prod.stock - item.quantity);
                    await supabase.from('master_products').update({ stock: newStock }).eq('id', item.productId);
                }
            }
        }
    }

    return { success: true, order: orderResult };
}

