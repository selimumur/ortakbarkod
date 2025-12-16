"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getDashboardDataAction(timeRange: string = "Bu Ay") {
    try {
        const { orgId } = await auth();
        // if (!orgId) throw new Error("Unauthorized"); 

        const timestamp = new Date().toISOString();

        if (!orgId) {
            return {
                kpi: { revenue: 0, profit: 0, margin: 0, orders: 0, avgOrder: 0, customers: 0, growth: 0, roi: 0, returnRate: 0, dailyAvg: 0 },
                charts: { trend: [], hourly: [], platforms: [], topCities: [] },
                recentOrders: [],
                alerts: { lowStock: [] },
                debug: {
                    serverTime: timestamp,
                    userId: "NO_ORG_ID",
                    orderCount: 0,
                    dbError: "Organization not found",
                    timeRange,
                    startDateStr: "N/A"
                }
            };
        }

        const supabase = getSupabaseAdmin();

        // 1. Determine Date Range
        const now = new Date();
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (timeRange === "Bugün") {
            // startDate is today 00:00
        } else if (timeRange === "Bu Hafta") {
            startDate.setDate(now.getDate() - 7);
        } else if (timeRange === "Bu Ay") {
            startDate.setDate(1); // First day of current month
        } else if (timeRange === "Bu Yıl") {
            startDate.setMonth(0, 1); // Jan 1st
        } else if (timeRange === "Tümü") {
            startDate = new Date(0); // Epoch start (1970)
        }

        const startDateStr = startDate.toISOString();

        console.log(`[Dashboard] User: ${orgId}, Range: ${timeRange}, Start: ${startDateStr}`);

        // 2. Fetch Orders (Active Date Range)
        // We only need fields for calculation
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .select('*')
            .eq('organization_id', orgId)
            .gte('order_date', startDateStr)
            .neq('status', 'İptal') // Exclude cancelled
            .order('order_date', { ascending: false });

        let dbErrMsg = null;
        if (orderError) {
            console.error("[Dashboard] Error:", orderError);
            dbErrMsg = orderError.message;
        }

        console.log(`[Dashboard] Orders Found: ${orders?.length}`);

        // 3. Fetch Products (For Cost & Stock Alerts)
        const { data: products, error: prodError } = await supabase
            .from('master_products')
            .select('code, name, stock, total_cost')
            .eq('organization_id', orgId);

        if (prodError) {
            dbErrMsg = (dbErrMsg ? dbErrMsg + " | " : "") + "Prod Error: " + prodError.message;
        }

        // 4. Calculate KPIs
        let revenue = 0;
        let cost = 0;
        let returnedCount = 0;
        let totalCount = 0;
        const activeOrders = orders || [];
        const prodMap = new Map(products?.map(p => [p.code, p]));

        // Trend Map (Daily) - Initialize with last 14 days or relevant period?
        const dailyMap = new Map();
        // Prepare buckets for last 14 days (or relevant for the chart x-axis)
        // If we want to show the chart exactly as before:
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const k = d.toISOString().split('T')[0];
            dailyMap.set(k, { date: k, revenue: 0, orders: 0 });
        }

        const hours = new Array(24).fill(0);
        const pMap = new Map();
        const customers = new Set();

        activeOrders.forEach(o => {
            if (o.status === 'İade') returnedCount++;
            totalCount++;

            // Financials
            const price = Number(o.total_price) || 0;
            revenue += price;

            const prod = prodMap.get(o.product_code);
            // Cost fallback: 45% of price if no cost defined (Legacy logic preserved)
            // Note: product_count logic.
            const qty = Number(o.product_count) || 1;
            // If total_cost is unit cost? Assuming yes.
            const unitCost = prod?.total_cost ? Number(prod.total_cost) : (price / qty) * 0.45;

            if (prod?.total_cost) {
                cost += Number(prod.total_cost) * qty;
            } else {
                cost += price * 0.6; // Assuming 40% margin roughly if unknown
            }

            customers.add(o.customer_name);

            // Daily Trend (Only if falls within the last 14 days map)
            const dayKey = new Date(o.order_date).toISOString().split('T')[0];
            if (dailyMap.has(dayKey)) {
                dailyMap.get(dayKey).revenue += price;
                dailyMap.get(dayKey).orders += 1;
            }

            // Hourly
            const h = new Date(o.order_date).getHours();
            hours[h]++;

            // Platforms
            const p = o.platform || "Diğer";
            pMap.set(p, (pMap.get(p) || 0) + price);
        });

        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const returnRate = totalCount > 0 ? (returnedCount / totalCount) * 100 : 0;
        const roi = cost > 0 ? (profit / cost) * 100 : 0;

        // Charts
        const platforms = Array.from(pMap, ([name, val]: [string, any]) => ({
            name,
            value: val,
            percent: revenue > 0 ? (val / revenue) * 100 : 0
        }));

        // Top Cities (Hardcoded in original, preserving or mocking)
        const cities = [{ name: 'İstanbul', val: 45 }, { name: 'Ankara', val: 20 }, { name: 'İzmir', val: 15 }, { name: 'Bursa', val: 10 }, { name: 'Diğer', val: 10 }];

        // Alerts (Low Stock)
        const lowStock = products?.filter(p => (p.stock || 0) < 10).slice(0, 5) || [];

        return {
            kpi: {
                revenue,
                profit,
                margin,
                orders: totalCount,
                avgOrder: totalCount ? revenue / totalCount : 0,
                customers: customers.size,
                growth: 12.5, // Mocked in original
                roi,
                returnRate,
                dailyAvg: revenue / (timeRange === 'Bugün' ? 1 : 30) // Simplified avg
            },
            charts: {
                trend: Array.from(dailyMap.values()),
                hourly: hours.map((count, hr) => ({ hour: hr, count })),
                platforms,
                topCities: cities
            },
            recentOrders: orders?.slice(0, 8) || [],
            alerts: {
                lowStock
            },
            debug: {
                serverTime: new Date().toISOString(),
                userId: orgId,
                orderCount: orders?.length || 0,
                dbError: dbErrMsg,
                timeRange,
                startDateStr
            }
        };

    } catch (e: any) {
        console.error("[Dashboard] FATAL:", e);
        return {
            kpi: { revenue: 0, profit: 0, margin: 0, orders: 0, avgOrder: 0, customers: 0, growth: 0, roi: 0, returnRate: 0, dailyAvg: 0 },
            charts: { trend: [], hourly: [], platforms: [], topCities: [] },
            recentOrders: [],
            alerts: { lowStock: [] },
            debug: {
                serverTime: new Date().toISOString(),
                userId: "ERROR",
                orderCount: 0,
                dbError: e.message || "Unknown Error",
                timeRange,
                startDateStr: "Error"
            }
        }
    }
}
