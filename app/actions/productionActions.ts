'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";

// --- TYPES ---
export type GroupedOrder = {
    product_code: string;
    product_name: string;
    total_quantity: number;
    order_ids: number[];
    platforms: string[];
    customer_names: string[];
};

export type WorkOrder = {
    id: number;
    product_id: number;
    quantity: number;
    completed_quantity?: number;
    status: 'Planlandı' | 'Üretimde' | 'Tamamlandı';
    priority: string;
    notes: string;
    created_at: string;
    master_products?: { name: string; code: string; };
};

// 1. Get Pending Orders (Sipariş Havuzu)
export async function getPendingOrdersAction(search: string = "", statuses: string[] = []) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    let query = supabase.from('orders').select('*').eq('organization_id', orgId);

    if (statuses.length > 0) {
        query = query.in('status', statuses);
    }

    if (search) {
        query = query.or(`first_product_name.ilike.%${search}%,first_product_code.ilike.%${search}%`);
    }

    const { data, error } = await query.order('order_date', { ascending: true });
    if (error) throw new Error(error.message);

    // Client-side filtering logic moved here or kept simple
    // Filter: production_status is null or 'Bekliyor' or ''
    const filteredData = data.filter((o: any) =>
        !o.production_status ||
        o.production_status === 'Bekliyor' ||
        o.production_status === ''
    );

    // Grouping Logic
    const grouped = filteredData.reduce((acc: any, order: any) => {
        const code = order.first_product_code || order.product_code || "KOD_YOK";
        const name = order.first_product_name || order.product_name || "İsimsiz Ürün";

        if (!acc[code]) {
            acc[code] = {
                product_code: code,
                product_name: name,
                total_quantity: 0,
                order_ids: [],
                platforms: new Set(),
                customer_names: []
            };
        }

        const qty = Number(order.product_count || order.total_quantity || 1);
        acc[code].total_quantity += qty;
        acc[code].order_ids.push(order.id);
        acc[code].platforms.add(order.platform || "Diğer");
        if (acc[code].customer_names.length < 2) acc[code].customer_names.push(order.customer_name);

        return acc;
    }, {});

    return Object.values(grouped).map((g: any) => ({
        ...g, platforms: Array.from(g.platforms)
    })) as GroupedOrder[];
}

// 2. Get Work Orders (İş Emirleri)
export async function getWorkOrdersAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('work_orders')
        .select('*, master_products(name, code)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as WorkOrder[];
}

// 3. Calculate Materials
export async function calculateMaterialsAction(productCode: string, totalQuantity: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Get Product
    const { data: prod } = await supabase
        .from('master_products')
        .select('id')
        .eq('code', productCode)
        .eq('organization_id', orgId)
        .single();

    if (!prod) return null;

    // Get Components (Recipe)
    const { data: components } = await supabase
        .from('product_components')
        .select('*, materials(name, stock, unit)')
        .eq('master_product_id', prod.id)
        .eq('master_product_id', prod.id)
        .eq('organization_id', orgId); // Ensure components are also scoped if possible, or just via master_product dependency

    if (!components || components.length === 0) return null;

    return components.map((c: any) => {
        const req = c.quantity * totalQuantity;
        const stock = c.materials?.stock || 0;
        return {
            material_name: c.materials?.name || "Bilinmeyen Hammadde",
            unit: c.materials?.unit || "Adet",
            required: req,
            stock: stock,
            status: stock >= req ? 'ok' : (stock > 0 ? 'low' : 'critical')
        };
    });
}

// 4. Create Work Order (From Pending or Manual)
export async function createWorkOrderAction(payload: {
    product_code?: string;
    product_name?: string;
    product_id?: number;
    quantity: number;
    note?: string;
    order_ids?: number[]; // If coming from pending orders
    merge_to_id?: number;
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    let targetProductId = payload.product_id;

    // A. Resolve Product ID if code provided
    if (!targetProductId && payload.product_code) {
        const { data: product } = await supabase
            .from('master_products')
            .select('id')
            .eq('code', payload.product_code)
            .eq('organization_id', orgId)
            .single();

        targetProductId = product?.id;

        // Auto-create product if missing (only for pending orders flow basically)
        if (!targetProductId && payload.product_name) {
            const { data: newProd, error } = await supabase.from('master_products').insert({
                name: payload.product_name,
                code: payload.product_code,
                stock: 0,
                organization_id: orgId
            }).select().single();

            if (error) throw new Error("Ürün oluşturulamadı: " + error.message);
            targetProductId = newProd.id;
        }
    }

    if (!targetProductId) throw new Error("Ürün bulunamadı veya oluşturulamadı.");

    // B. Merge or Create
    if (payload.merge_to_id) {
        const { data: existing } = await supabase
            .from('work_orders')
            .select('quantity, notes')
            .eq('id', payload.merge_to_id)
            .eq('organization_id', orgId)
            .single();

        if (!existing) throw new Error("Hedef emir bulunamadı");

        await supabase.from('work_orders').update({
            quantity: existing.quantity + payload.quantity,
            notes: existing.notes + ` | +${payload.quantity} eklendi.`
        }).eq('id', payload.merge_to_id).eq('organization_id', orgId);
    } else {
        await supabase.from('work_orders').insert({
            product_id: targetProductId,
            quantity: payload.quantity,
            status: 'Planlandı',
            priority: 'Normal',
            notes: payload.note || (payload.order_ids ? `${payload.order_ids.length} siparişten oto. oluşturuldu.` : ''),
            due_date: new Date().toISOString(),
            organization_id: orgId
        });
    }

    // C. Update Source Orders Status
    if (payload.order_ids && payload.order_ids.length > 0) {
        await supabase
            .from('orders')
            .update({ production_status: 'Üretimde' })
            .in('id', payload.order_ids)
            .eq('organization_id', orgId);
    }

    revalidatePath('/uretim');
    return { success: true };
}

// 5. Update Status
export async function updateWorkOrderStatusAction(id: number, newStatus: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    const updateData: any = { status: newStatus };

    // If Completed, Increment Stock
    if (newStatus === 'Tamamlandı') {
        const { data: order } = await supabase
            .from('work_orders')
            .select('product_id, quantity')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single();

        if (order && order.product_id) {
            // Custom Increment Logic via DB call or explicit update
            // Using explicit select+update for safety/audit instead of RPC if no generic RPC exists
            // BUT user had `increment_product_stock` RPC call. Let's try to mimic or use scalar.
            // Usually better to have transaction.
            // We'll assume simple fetch-add-update for now or custom rpc if available.
            // Let's use simple update:
            const { data: prod } = await supabase.from('master_products').select('stock').eq('id', order.product_id).eq('organization_id', orgId).single();
            if (prod) {
                await supabase.from('master_products')
                    .update({ stock: prod.stock + order.quantity })
                    .eq('id', order.product_id)
                    .eq('organization_id', orgId);
            }
        }
    }

    const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/uretim');
    return { success: true };
}

// 6. Search Products (For modal)
export async function searchProductionProductsAction(term: string) {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('master_products')
        .select('id, name, code, image_url, stock')
        .eq('organization_id', orgId)
        .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        .limit(10);

    return data || [];
}

// 7. Get Production Line Orders (Active Only)
export async function getProductionLineOrdersAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Fetch active orders suitable for production line screen
    const { data, error } = await supabase
        .from('work_orders')
        .select('*, master_products(name, code)')
        .eq('organization_id', orgId)
        .neq('status', 'Tamamlandı')
        .order('created_at', { ascending: true }); // Oldest first typically for FIFO

    if (error) throw new Error(error.message);
    return data;
}

// 8. Get Production Reports Data
export async function getProductionReportsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Fetch all orders for stats
    // Ideally we would use database aggregation (count, sum) for scalability,
    // but for now keeping logic consistent with previous client-side implementation.
    const { data: orders, error } = await supabase
        .from('work_orders')
        .select('id, status, completed_quantity, created_at')
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    if (!orders) return { stats: {}, daily: [], distribution: [] };

    // Calculate Stats
    const totalProduced = orders.reduce((acc: number, o: any) => acc + (o.completed_quantity || 0), 0);
    const activeOrders = orders.filter((o: any) => o.status !== 'Tamamlandı').length;

    // Status Distribution
    const statusCounts: Record<string, number> = {};
    orders.forEach((o: any) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    const distribution = Object.keys(statusCounts).map(k => ({ name: k, value: statusCounts[k] }));

    // Daily Production (Last 7 Days)
    // Counting orders created per day
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    const daily = last7Days.map(date => {
        const count = orders.filter((o: any) => o.created_at && o.created_at.startsWith(date)).length;
        return { date, count };
    });

    return {
        stats: {
            totalProduced,
            activeOrders,
            efficiency: 85, // Mock value preserved
            scrapRate: 2.1  // Mock value preserved
        },
        dailyProduction: daily,
        statusDistribution: distribution
    };
}

// 9. Get Job Details (For Modal)
export async function getJobDetailsAction(workOrderId: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    // fetch order to get product_id
    // Supabase TS types might return array for relation if not strict. 
    // Using simple query first.
    const { data: order } = await supabase.from('work_orders').select('product_id').eq('id', workOrderId).single();
    if (!order || !order.product_id) return null;

    const pid = order.product_id;

    const [cuts, prod, components, personnel] = await Promise.all([
        supabase.from('product_cuts').select('*').eq('master_product_id', pid).eq('organization_id', orgId),
        supabase.from('master_products').select('width, length, height, desi, weight').eq('id', pid).eq('organization_id', orgId).single(),
        supabase.from('product_components').select('*, materials(name, unit)').eq('master_product_id', pid).eq('organization_id', orgId),
        supabase.from('personnel').select('*')
    ]);

    return {
        cuts: cuts.data || [],
        productDetails: prod.data || {},
        components: components.data || [],
        personnel: personnel.data || []
    };
}

// 10. Complete Job Action
export async function completeJobAction(payload: {
    orderId: number,
    producedNow: number,
    boxCount: number,
    packingStaff: string[]
}) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    const supabase = getSupabaseAdmin();

    const { orderId, producedNow, boxCount, packingStaff } = payload;

    // 1. Fetch Fresh Data
    const { data: freshOrder, error: fetchError } = await supabase
        .from('work_orders')
        .select('id, quantity, completed_quantity, product_id, master_products(code, name)')
        .eq('id', orderId)
        .eq('organization_id', orgId)
        .single();


    if (fetchError || !freshOrder) throw new Error("Emir bulunamadı.");

    const currentCompleted = Number(freshOrder.completed_quantity) || 0;
    const totalQty = Number(freshOrder.quantity) || 1;
    const newTotal = currentCompleted + producedNow;
    const isFinished = newTotal >= totalQty;

    // Handle relation array/object issue manually
    // If master_products is array, take first. If object, take it.
    const mp: any = freshOrder.master_products;
    const prodName = Array.isArray(mp) ? mp[0]?.name : mp?.name;
    const prodCode = Array.isArray(mp) ? mp[0]?.code : mp?.code;

    // 2. LOG KAYDI
    await supabase.from('production_logs').insert({
        work_order_id: orderId,
        product_name: prodName,
        box_count: boxCount,
        packing_staff: packingStaff.join(", "),
        qr_data: `Miktar: ${producedNow}`,
        organization_id: orgId // Ensure log is scoped
    });

    // 3. İş Emrini Güncelle
    await supabase.from('work_orders').update({
        completed_quantity: newTotal,
        status: isFinished ? 'Tamamlandı' : 'Kısmi Üretim',
        completed_at: isFinished ? new Date().toISOString() : null
    }).eq('id', orderId).eq('organization_id', orgId);

    // 4. Stok Güncelle
    if (freshOrder.product_id) {
        // Increment stock
        const { data: prod } = await supabase.from('master_products').select('stock').eq('id', freshOrder.product_id).eq('organization_id', orgId).single();
        if (prod) {
            await supabase.from('master_products')
                .update({ stock: prod.stock + producedNow })
                .eq('id', freshOrder.product_id)
                .eq('organization_id', orgId);
        }
    }

    // 5. Sipariş Havuzunu Senkronize Et
    if (isFinished && prodCode) {
        await supabase.from('orders')
            .update({ production_status: 'Tamamlandı', status: 'Hazırlanıyor' })
            .eq('production_status', 'Üretimde')
            .or(`product_code.eq.${prodCode},first_product_code.eq.${prodCode}`)
            .eq('organization_id', orgId);
    }

    revalidatePath('/uretim');
    revalidatePath('/uretim/hat');

    return { success: true, isFinished };
}
