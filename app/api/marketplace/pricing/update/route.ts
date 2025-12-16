
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from '@clerk/nextjs/server'; // Keep existing or remove if managed better
import { getOrganizationId } from "@/lib/accessControl";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { productId, marketplaceId, newPrice } = await request.json();
        const orgId = await getOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Check ownership of the product AND integration existence
        // We can do an upsert or update, but we should verify the product belongs to user first.

        // 1. Verify Product Ownership
        const { data: product, error: prodError } = await supabase
            .from('master_products')
            .select('id')
            .eq('id', productId)
            .eq('organization_id', orgId)
            .single();

        if (prodError || !product) {
            return NextResponse.json({ success: false, error: "Product not found or unauthorized" }, { status: 404 });
        }

        // 2. Update Price
        const { error } = await supabase
            .from('product_marketplaces')
            .update({
                current_sale_price: newPrice,
                last_price_check_at: new Date().toISOString()
            })
            .eq('product_id', productId)
            .eq('marketplace_id', marketplaceId)
            .eq('organization_id', orgId); // Scoped

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
