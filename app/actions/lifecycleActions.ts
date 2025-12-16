'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

export async function searchProductsAction(term: string) {
    const { userId } = await auth();
    if (!userId) return [];
    if (!term || term.length < 3) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('master_products')
        .select('*')
        .eq('organization_id', userId)
        .ilike('name', `%${term}%`)
        .limit(10); // Return up to 10 suggestions

    return data || [];
}

export async function getLifecycleDataAction(productId: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // 1. Get Product
    const { data: product } = await supabase
        .from('master_products')
        .select('*')
        .eq('id', productId)
        .eq('organization_id', userId)
        .single();

    if (!product) throw new Error("Ürün bulunamadı.");

    // 2. Get Orders for this Product
    // Assuming we can link orders to products via product_code or id
    // master_products.code <-> orders.product_code
    // Note: If product doesn't have a code, this might fail.

    if (!product.code) {
        return {
            product,
            chartData: [],
            summary: { lifecycle_phase: "Tanımsız (Kod Yok)" },
            correlation: null
        };
    }

    const { data: orders } = await supabase
        .from('orders')
        .select('order_date, total_price, product_count, product_code')
        .eq('organization_id', userId)
        .eq('product_code', product.code)
        .neq('status', 'İptal')
        .order('order_date', { ascending: true });

    if (!orders || orders.length === 0) {
        return {
            product,
            chartData: [],
            summary: { lifecycle_phase: "Giriş (Henüz Satış Yok)" },
            correlation: {
                text: "Bu ürün henüz veri oluşturmaya başlamadı. İlk izlenimler, doğru fiyatlandırma ve reklam stratejisi ile giriş evresini hızlandırabileceğiniz yönünde.",
                suggestion: "Lansman Kampanyası Başlatın"
            }
        };
    }

    // 3. Process Data for Chart (Monthly)
    const monthlyGroups = new Map();

    // Helper to get Year-Month key
    const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    let firstSaleDate = orders[0].order_date;
    let maxSalesCount = 0;
    let maxSalesDate = "";

    orders.forEach(o => {
        const k = getMonthKey(o.order_date);

        if (!monthlyGroups.has(k)) {
            monthlyGroups.set(k, { month: k, sales: 0, revenue: 0, price: 0, count: 0 });
        }

        const g = monthlyGroups.get(k);
        const qty = Number(o.product_count) || 1;
        const price = Number(o.total_price); // Total line price

        g.sales += qty;
        g.revenue += price;
        g.count += 1; // Order count (or line count)
    });

    // Calculate Avg Price per month and Convert to Array
    const chartData = Array.from(monthlyGroups.values()).map((Group: any) => {
        const avgPrice = Group.revenue / (Group.sales || 1); // Avg price per unit roughly
        return {
            month: Group.month,
            sales: Group.sales,
            revenue: Group.revenue,
            price: Math.round(avgPrice),
            adSpend: Math.round(Math.random() * 500) // Mock Ad Spend for now as we don't have ad_spend table linked yet
        };
    }).sort((a, b) => a.month.localeCompare(b.month)); // Ensure chronological order

    // 4. Determine Lifecycle Phase
    // Simple logic:
    // - Less than 3 months of data -> Intro
    // - Last month > Avg of previous 3 -> Growth
    // - Last month stable (+- 10%) compared to peak -> Maturity
    // - Last month < 70% of peak -> Decline

    const monthsCount = chartData.length;
    let phase = "Giriş (Introduction)";
    let suggestion = "Reklam bütçesini artırarak bilinirliği yükseltin.";
    let analysisText = "Ürün henüz pazarla tanışma aşamasında.";

    if (monthsCount >= 3) {
        const lastMonth = chartData[monthsCount - 1].sales;
        const peak = Math.max(...chartData.map(d => d.sales));

        // Find Peak Date
        const peakData = chartData.find(d => d.sales === peak);
        if (peakData) {
            maxSalesCount = peak;
            maxSalesDate = peakData.month;
        }

        if (lastMonth >= peak * 0.9) {
            phase = "Olgunluk (Maturity)";
            suggestion = "Maliyetleri optimize edin ve kârlılığı maksimize edin.";
            analysisText = "Ürün satışları zirveye yakın ve istikrarlı. Pazar payını korumaya odaklanın.";
        } else if (lastMonth < peak * 0.6) {
            phase = "Düşüş (Decline)";
            suggestion = "Stok eritme kampanyaları veya ürün yenileme düşünün.";
            analysisText = "Satışlarda belirgin bir düşüş trendi var. Ürün yaşam döngüsünün sonuna yaklaşıyor olabilir.";
        } else {
            // Check trend of last 3 months
            const prev = chartData[monthsCount - 2].sales;
            if (lastMonth > prev) {
                phase = "Büyüme (Growth)";
                suggestion = "Stok seviyelerini artırın, talebe yetişin.";
                analysisText = "Satışlar yükseliş trendinde. Talep artışı devam ediyor.";
            } else {
                phase = "Doygunluk";
                suggestion = "Farklı pazaryerlerine açılarak yeni kitleler bulun.";
                analysisText = "Büyüme hızı yavaşladı, stabilizasyon başlıyor.";
            }
        }
    }

    return {
        product,
        chartData,
        summary: {
            lifecycle_phase: phase,
            first_listed_at: firstSaleDate,
            peak_sales_date: maxSalesDate,
            peak_sales_count: maxSalesCount
        },
        correlation: {
            text: analysisText,
            suggestion: suggestion
        }
    };
}
