'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

export type SalesDataPoint = {
    month: string;
    sales: number;
    type: 'actual' | 'forecast';
};

export type CategoryTrend = {
    name: string;
    growth: string;
    trend: 'up' | 'down';
};

export type ForecastData = {
    chartData: SalesDataPoint[];
    nextMonthForecast: number;
    growthRate: number; // Percentage
    topCategories: CategoryTrend[];
};

export async function getSalesForecastAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = getSupabaseAdmin();

    // Fetch orders to calculate history
    const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('organization_id', orgId)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: true });

    // Mock data/fallback if no orders exist yet
    if (!orders || orders.length < 5) {
        // Fallback to "Demo Mode" with realistic looking data if DB is empty
        return {
            chartData: [
                { month: 'Oca', sales: 45000, type: 'actual' },
                { month: 'Şub', sales: 42000, type: 'actual' },
                { month: 'Mar', sales: 48000, type: 'actual' },
                { month: 'Nis', sales: 51000, type: 'actual' },
                { month: 'May', sales: 55000, type: 'actual' },
                { month: 'Haz', sales: 62000, type: 'actual' },
                { month: 'Tem', sales: 68500, type: 'forecast' },
                { month: 'Ağu', sales: 75200, type: 'forecast' },
                { month: 'Eyl', sales: 81000, type: 'forecast' },
            ],
            nextMonthForecast: 68500,
            growthRate: 18.4,
            topCategories: [
                { name: "Erkek Giyim", growth: "+12%", trend: "up" },
                { name: "Ayakkabı", growth: "+8%", trend: "up" },
                { name: "Aksesuar", growth: "-2%", trend: "down" },
            ]
        } as ForecastData;
    }

    // Process Real Data
    // Group by month
    const montlySales: Record<string, number> = {};
    orders.forEach(o => {
        const date = new Date(o.created_at);
        const key = date.toLocaleString('tr-TR', { month: 'short' }); // e.g., "Oca"
        montlySales[key] = (montlySales[key] || 0) + Number(o.total_amount);
    });

    const categories = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    // Sort logic needs careful date handling, but for MVP assuming current year data
    const chartData: SalesDataPoint[] = Object.keys(montlySales).map(key => ({
        month: key,
        sales: montlySales[key],
        type: 'actual'
    }));

    // Simple Linear Forecast for next 3 months
    const lastSales = chartData.length > 0 ? chartData[chartData.length - 1].sales : 0;
    const growthFactor = 1.1; // 10% growth assumption

    const nextMonth1 = lastSales * growthFactor;
    const nextMonth2 = nextMonth1 * growthFactor;
    const nextMonth3 = nextMonth2 * growthFactor;

    chartData.push({ month: 'Tahmin 1', sales: Math.round(nextMonth1), type: 'forecast' });
    chartData.push({ month: 'Tahmin 2', sales: Math.round(nextMonth2), type: 'forecast' });
    chartData.push({ month: 'Tahmin 3', sales: Math.round(nextMonth3), type: 'forecast' });

    return {
        chartData,
        nextMonthForecast: Math.round(nextMonth1),
        growthRate: 10,
        topCategories: [
            { name: "Genel Satış", growth: "+10%", trend: "up" },
        ]
    } as ForecastData;
}
