'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";
import { checkLimit } from "@/lib/subscription";

export async function getProductDetailsAction(productId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    // Check ownership first? 
    // master_products should be checked.
    const supabase = getSupabaseAdmin();
    // Verify product belongs to user (or is public?) - assume User specific
    const { data: product } = await supabase.from('master_products').select('id').eq('id', productId).eq('organization_id', orgId).single();
    if (!product) throw new Error("Product not found or access denied");

    const [cutRes, compRes, parcelRes] = await Promise.all([
        supabase.from('product_cuts').select('*').eq('master_product_id', productId),
        supabase.from('product_components').select('*').eq('master_product_id', productId),
        supabase.from('product_parcels').select('*').eq('master_product_id', productId)
    ]);

    return {
        cuts: cutRes.data || [],
        components: compRes.data || [],
        parcels: parcelRes.data || []
    };
}

export async function saveProductAction(product: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    if (product.id && product.id > 0) {
        // Update
        const { error } = await supabase.from('master_products').update({
            name: product.name,
            code: product.code,
            barcode: product.barcode,
            category: product.category,
            brand: product.brand,
            price: product.price,
            market_price: product.market_price,
            stock: product.stock,
            vat_rate: product.vat_rate,
            shipment_days: product.shipment_days,
            description: product.description,
            images: product.images,
            image_url: product.image_url,
            product_url: product.product_url,
            // total_desi is updated via triggers or manual logic? Page updates it manually.
            total_desi: product.total_desi
        }).eq('id', product.id).eq('organization_id', orgId);

        if (error) throw new Error(error.message);
        return { success: true };
    } else {
        // Insert (New)

        // 1. Quota Check
        const { allowed, current, limit } = await checkLimit('products');

        if (!allowed) {
            throw new Error(`Ürün limitinize (${limit}) ulaştınız. Lütfen paketinizi yükseltin.`);
        }

        const { data, error } = await supabase.from('master_products').insert({
            ...product,
            organization_id: orgId
        }).select().single();

        if (error) throw new Error(error.message);
        return { success: true, product: data };
    }
}

export async function addProductItemAction(table: 'product_cuts' | 'product_components' | 'product_parcels', payload: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // Verify master_product ownership
    if (payload.master_product_id) {
        const { data } = await supabase.from('master_products').select('id').eq('id', payload.master_product_id).eq('organization_id', orgId).single();
        if (!data) throw new Error("Invalid product");
    }

    const { error } = await supabase.from(table).insert(payload);
    if (error) throw new Error(error.message);

    // Return refreshed list?
    const { data: list } = await supabase.from(table).select('*').eq('master_product_id', payload.master_product_id);
    return list || [];
}

export async function deleteProductItemAction(table: 'product_cuts' | 'product_components' | 'product_parcels', id: number, masterProductId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // Ideally we verify the item belongs to a product owned by user.
    // Simpler: Check if master product owned by user.
    const { data } = await supabase.from('master_products').select('id').eq('id', masterProductId).eq('organization_id', orgId).single();
    if (!data) throw new Error("Access denied");

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);

    return { success: true };
}
