import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Determine Date Range (Default: Yesterday)
        // In a real job, this could be passed as body params
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        console.log(`[Aggregation] Starting aggregation for ${dateStr}...`);

        // 2. Fetch Orders for that day
        const startOfDay = `${dateStr}T00:00:00.000Z`;
        const endOfDay = `${dateStr}T23:59:59.999Z`;

        const { data: items, error } = await supabase
            .from('marketplace_order_items')
            .select(`
                quantity,
                line_total,
                marketplace_sku,
                product_id,
                store_id:marketplace_orders!inner(store_id),
                order_date:marketplace_orders!inner(order_date)
            `)
            .gte('marketplace_orders.order_date', startOfDay)
            .lte('marketplace_orders.order_date', endOfDay);

        if (error) throw error;
        if (!items || items.length === 0) {
            return NextResponse.json({ message: "No orders found for this date", date: dateStr });
        }

        // 3. Group by Product/SKU
        const metricsMap = new Map();

        items.forEach((item: any) => {
            const key = `${item.store_id.store_id}-${item.product_id}-${item.marketplace_sku}`;

            if (!metricsMap.has(key)) {
                metricsMap.set(key, {
                    date: dateStr,
                    store_id: item.store_id.store_id,
                    product_id: item.product_id,
                    marketplace_sku: item.marketplace_sku,
                    sales_count: 0,
                    sales_revenue: 0,
                    count: 0
                });
            }

            const metric = metricsMap.get(key);
            metric.sales_count += item.quantity || 0;
            metric.sales_revenue += item.line_total || 0;
            metric.count += 1;
        });

        // 4. Upsert to product_daily_metrics
        const metricsArray = Array.from(metricsMap.values()).map(m => ({
            date: m.date,
            store_id: m.store_id,
            product_id: m.product_id,
            marketplace_sku: m.marketplace_sku,
            sales_count: m.sales_count,
            sales_revenue: m.sales_revenue,
            average_price: m.sales_count > 0 ? (m.sales_revenue / m.sales_count) : 0,
            calculated_at: new Date().toISOString()
        }));

        const { error: upsertError } = await supabase
            .from('product_daily_metrics')
            .upsert(metricsArray, { onConflict: 'date,store_id,product_id,marketplace_sku' });

        if (upsertError) throw upsertError;

        return NextResponse.json({ success: true, processed: metricsArray.length, date: dateStr });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
