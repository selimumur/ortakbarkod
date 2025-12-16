
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getOrganizationId } from "@/lib/accessControl";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
    try {
        const orgId = await getOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await request.json();
        const supabase = getSupabaseAdmin();
        const rawOrderData = payload.orderData || {};

        // MAPPING & SANITIZATION
        const dbOrderData = {
            store_id: null, // Manual orders have no store_id (bigint)
            order_number: rawOrderData.order_number,
            customer_name: rawOrderData.customer_name,
            production_status: rawOrderData.status, // Map status -> production_status
            total_price: rawOrderData.total_price,
            platform: rawOrderData.platform,
            manual_source: rawOrderData.manual_source,
            customer_phone: rawOrderData.customer_phone,
            customer_city: rawOrderData.customer_city,
            customer_district: rawOrderData.customer_district,
            customer_address: rawOrderData.delivery_address, // Map delivery_address -> customer_address
            payment_method: rawOrderData.payment_method,
            // Map cargo_tracking_number -> cargo_tracking_link if needed, or just ignore if not column
            cargo_tracking_link: rawOrderData.cargo_tracking_number,
            cargo_provider_name: rawOrderData.cargo_provider_name,
            // notes: rawOrderData.notes, // Notes column doesn't exist, stored in raw_data usually
            is_manual: true,
            // REMOVE NON-EXISTENT COLUMNS
            // product_count, product_name, product_code, img_url are removed
            raw_data: {
                ...rawOrderData.raw_data,
                notes: rawOrderData.notes // Ensure notes are preserved in raw_data
            },
            manual_shipping_cost: rawOrderData.manual_shipping_cost,
            discount_amount: rawOrderData.discount_amount,
            organization_id: orgId
        };

        const isEdit = !!payload.id;
        let orderId = payload.id;
        let orderResult;

        if (isEdit && orderId) {
            // Update
            const { data, error } = await supabase.from('orders').update(dbOrderData)
                .eq('id', orderId).eq('organization_id', orgId).select().single();

            if (error) throw new Error("Update Error: " + error.message);
            orderResult = data;
        } else {
            // Insert
            const { data, error } = await supabase.from('orders').insert(dbOrderData).select().single();
            if (error) throw new Error("Insert Error: " + error.message);
            orderResult = data;
            orderId = data.id;
        }

        // Stock Management Logic
        const cart = payload.cart || [];
        const originalCart = payload.originalCart || [];

        // Revert Original Cart (Add back to stock)
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

        return NextResponse.json({ success: true, order: orderResult });

    } catch (err: any) {
        console.error("API Save Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
