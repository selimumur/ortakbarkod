import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

        const supabase = await createClient();

        // 1. Fetch Daily Metrics (Chart Data)
        const { data: metrics } = await supabase
            .from('product_daily_metrics')
            .select('*')
            .eq('product_id', productId)
            .order('date', { ascending: true })
            .limit(365); // Last 1 year

        // 2. Fetch Summary Statistics
        let summary = null;
        const { data: summaryData } = await supabase
            .from('product_lifecycle_summary')
            .select('*')
            .eq('product_id', productId)
            .single();

        if (summaryData) {
            summary = summaryData;
        } else {
            // Dynamic Calculation if no summary exists (First time)
            if (metrics && metrics.length > 0) {
                const totalSales = metrics.reduce((sum, m) => sum + (m.sales_count || 0), 0);
                const totalRevenue = metrics.reduce((sum, m) => sum + (m.sales_revenue || 0), 0);
                const firstDate = metrics[0].date;

                // Find Peak
                let peak = { revenue: 0, date: null };
                metrics.forEach(m => {
                    if ((m.sales_revenue || 0) > peak.revenue) peak = { revenue: m.sales_revenue, date: m.date };
                });

                summary = {
                    product_id: productId,
                    first_listed_at: firstDate,
                    total_sales_all_time: totalSales,
                    total_revenue_all_time: totalRevenue,
                    peak_sales_date: peak.date,
                    lifecycle_phase: 'Calculated' // Simple
                };
            }
        }

        // 3. Format Chart Data for Frontend
        const chartData = metrics ? metrics.map(m => ({
            month: new Date(m.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            sales: m.sales_count || 0,
            price: m.average_price || 0,
            adSpend: m.ad_spend || 0,
            revenue: m.sales_revenue || 0
        })) : [];

        // 4. Generate AI Insights (Rule-based for now)
        // Detect Correlation between Price Drop and Sales Spike
        let correlation = null;
        if (chartData.length > 5) {
            // Simple logic: If price drops 10% and sales increase 20% in same period
            // This is a placeholder for the advanced AI logic described in design doc
            correlation = {
                text: "Veri seti henüz tam analiz için yeterli değil, ancak satışlar stabil görünüyor.",
                impact: 'neutral',
                suggestion: "Daha fazla veri biriktikçe öneriler burada belirecek."
            };
        }

        return NextResponse.json({
            success: true,
            summary: summary || {},
            chartData: chartData,
            correlation: correlation
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
