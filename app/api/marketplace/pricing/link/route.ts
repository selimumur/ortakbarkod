
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { productId, marketplaceId, remoteId, remoteInitialPrice } = await request.json();
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Verify Product Ownership
        const { data: product } = await supabase
            .from('master_products')
            .select('code')
            .eq('id', productId)
            .eq('organization_id', userId)
            .single();

        if (!product) {
            return NextResponse.json({ success: false, error: "Product not found or unauthorized" }, { status: 404 });
        }

        // 2. Link (Upsert)
        const { error } = await supabase
            .from('product_marketplaces')
            .upsert({
                product_id: productId,
                marketplace_id: marketplaceId,
                remote_product_id: remoteId,
                current_sale_price: remoteInitialPrice || 0,
                status: 'Active',
                barcode: product.code, // Sync barcode from master product
                organization_id: userId
            }, { onConflict: 'product_id, marketplace_id' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
