'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";
import { revalidatePath } from "next/cache";

export type ReportsData = {
    totalRevenue: number;
    netProfit: number;
    totalOrders: number;
    avgOrderValue: number;
    returnRate: number;
    returnCost: number;
    salesTrend: { date: string; value: number }[];
    topProducts: { name: string; count: number; rev: number }[];
    topReturns: any[];
    topCities: { name: string; count: number }[];
    busyHours: { hour: string; count: number }[];
    busyDays: { day: string; count: number }[];
};

export async function getReportsSummaryAction(startDate: string, endDate: string): Promise<ReportsData> {
    const orgId = await getOrganizationId();
    if (!orgId) {
        return {
            totalRevenue: 0,
            netProfit: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            returnRate: 0,
            returnCost: 0,
            salesTrend: [],
            topProducts: [],
            topReturns: [],
            topCities: [],
            busyHours: [],
            busyDays: []
        };
    }

    const supabase = getSupabaseAdmin();

    // Adjust dates for query
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    // 1. Fetch Orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgId)
        .gte('order_date', start.toISOString())
        .lte('order_date', end.toISOString())
        .order('order_date', { ascending: true });

    if (!orders || orders.length === 0) {
        return {
            totalRevenue: 0,
            netProfit: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            returnRate: 0,
            returnCost: 0,
            salesTrend: [],
            topProducts: [],
            topReturns: [],
            topCities: [],
            busyHours: [],
            busyDays: []
        };
    }

    // 2. Fetch Products for Cost Calculation
    // Only fetch products relevant to these orders if possible, or all products.
    // Assuming master_products is not too huge, fetching simplified list is okay.
    // Or we can fetch costs only for product_codes in orders.
    const productCodes = Array.from(new Set(orders.map(o => o.product_code).filter(Boolean)));

    let products: any[] = [];
    if (productCodes.length > 0) {
        const { data: prods } = await supabase
            .from('master_products')
            .select('code, name, total_cost')
            .eq('organization_id', orgId)
            .in('code', productCodes);
        products = prods || [];
    }

    // 3. Process Data (Server-Side Calculation)
    const validOrders = orders.filter(o => o.status !== 'İptal' && o.status !== 'İade');
    const returnedOrders = orders.filter(o => o.status === 'İade');

    const totalRev = validOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
    const totalCount = orders.length; // Including returns? Usually total orders means all placed orders.
    // Client code used filteredOrders.length which included returns but maybe excluded something else?
    // Client code: const validOrders = filteredOrders.filter(o => o.status !== 'İptal' && o.status !== 'İade');
    // totalRev from validOrders.
    // totalCount from filteredOrders.length (so includes returns/cancels?).
    // Let's stick to total placed orders count.

    // Profit Calc
    let estimatedProfit = 0;
    validOrders.forEach(o => {
        const prod = products.find(p => p.code === o.product_code);
        const cost = prod?.total_cost || (o.total_price * 0.5); // Fallback 50%
        estimatedProfit += (o.total_price - cost - (o.total_price * 0.21)); // VAT 21% assumed? Code says 0.21.
    });

    const returnCostLoss = returnedOrders.reduce((acc, o) => acc + 50 + (Number(o.total_price) * 0.1), 0);

    // Sales Trend
    const trendMap = new Map<string, number>();
    // Pre-fill dates
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        trendMap.set(d.toISOString().split('T')[0], 0);
    }
    validOrders.forEach(o => {
        const key = new Date(o.order_date).toISOString().split('T')[0];
        if (trendMap.has(key)) {
            trendMap.set(key, (trendMap.get(key) || 0) + o.total_price);
        }
    });
    const salesTrend = Array.from(trendMap, ([date, value]) => ({
        date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        value
    }));

    // Top Products
    const prodMap = new Map<string, { count: number, rev: number }>();
    validOrders.forEach(o => {
        const name = o.product_name || o.first_product_name || "Bilinmeyen";
        const cur = prodMap.get(name) || { count: 0, rev: 0 };
        prodMap.set(name, { count: cur.count + (o.product_count || 1), rev: cur.rev + o.total_price });
    });
    const topProducts = Array.from(prodMap, ([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.rev - a.rev)
        .slice(0, 5);

    // Top Cities
    const cityMap = new Map<string, number>();
    validOrders.forEach(o => {
        let city = o.raw_data?.shipmentAddress?.city || "Belirsiz";
        if (typeof city === 'string') city = city.toUpperCase().trim();
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });
    const topCities = Array.from(cityMap, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

    // Busy Hours/Days
    const hourMap = new Array(24).fill(0);
    const dayMap = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const dayCount = new Array(7).fill(0);
    validOrders.forEach(o => {
        const d = new Date(o.order_date);
        hourMap[d.getHours()]++;
        dayCount[d.getDay()]++;
    });
    const busyHours = hourMap.map((count, hour) => ({ hour: `${hour}:00`, count }));
    const busyDays = dayCount.map((count, i) => ({ day: dayMap[i], count }));

    return {
        totalRevenue: totalRev,
        netProfit: estimatedProfit,
        totalOrders: totalCount,
        avgOrderValue: totalCount > 0 ? totalRev / totalCount : 0,
        returnRate: totalCount > 0 ? (returnedOrders.length / totalCount) * 100 : 0,
        returnCost: returnCostLoss,
        salesTrend,
        topProducts,
        topReturns: [], // Not implemented in client
        topCities,
        busyHours,
        busyDays
    };
}
