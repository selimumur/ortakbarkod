'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

export async function searchProductsForOrderAction(search: string) {
    // Test Auth
    const { userId } = await auth();
    if (!userId) {
        console.log("SERVER: Unauthorized");
        return [];
    }

    // Test Supabase
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('master_products')
            .select('id, name, code, stock, price, image_url')
            .eq('organization_id', userId)
            .or(`name.ilike.%${search}%,code.ilike.%${search}%`)
            .limit(20);

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error(error.message);
        }
        return data;

    } catch (e: any) {
        console.error("Action Error:", e);
        throw e;
    }
}

export async function getManualOrderAction(orderId: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('organization_id', userId)
        .single();

    if (error) {
        console.error("Fetch Manual Order Error:", error);
        return null;
    }
    return data;
}

export async function saveManualOrderAction(payload: any, isEdit: boolean) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    let orderId = payload.id;
    let orderResult;

    if (isEdit && orderId) {
        // Update
        const { data, error } = await supabase.from('orders').update({
            ...payload.orderData,
            organization_id: userId
        }).eq('id', orderId).eq('organization_id', userId).select().single();
        if (error) throw new Error("Update Error: " + error.message);
        orderResult = data;
    } else {
        // Insert
        const insertData = { ...payload.orderData, organization_id: userId };
        delete insertData.id;

        const { data, error } = await supabase.from('orders').insert(insertData).select().single();
        if (error) throw new Error("Insert Error: " + error.message);
        orderResult = data;
        orderId = data.id;
    }

    // Stock
    const cart = payload.cart || [];
    const originalCart = payload.originalCart || [];

    // Revert
    if (isEdit && originalCart.length > 0) {
        for (const item of originalCart) {
            if (item.productId) {
                const { data: prod } = await supabase.from('master_products').select('stock').eq('id', item.productId).single();
                if (prod) {
                    await supabase.from('master_products').update({ stock: prod.stock + item.quantity }).eq('id', item.productId);
                }
            }
        }
    }

    // Deduct
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
