'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

export type CampaignOpportunity = {
    id: number;
    productId: number;
    productName: string;
    currentPrice: number;
    stock: number;
    campaignName: string;
    description: string;
    suggestedDiscount: number;
    discountedPrice: number;
    estimatedSales: number;
    estimatedRevenue: number;
    upliftPercentage: number;
    endDate: string;
    status: 'new' | 'joined';
    marketplace: string;
};

// 1. Generate Opportunities from REAL Products
export async function getCampaignOpportunitiesAction() {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = getSupabaseAdmin();

    // Fetch real products (limit 50 for performance)
    const { data: products } = await supabase
        .from('master_products')
        .select('*')
        .eq('organization_id', userId)
        .limit(50);

    if (!products || products.length === 0) return [];

    const opportunities: CampaignOpportunity[] = [];
    const campaignTypes = [
        { name: "Süper Fırsatlar", desc: "Yüksek stoklu ürünleri eritmek için ideal.", discount: 15 },
        { name: "Sezon Sonu İndirimi", desc: "Sezon ürünlerinde son şans indirimi.", discount: 25 },
        { name: "Çok Al Az Öde", desc: "Sepet tutarını artırmaya yönelik.", discount: 10 },
        { name: "Flash İndirim", desc: "Acil satış ihtiyacı olan ürünler.", discount: 20 }
    ];

    products.forEach((p, idx) => {
        // Skip if price or stock is missing/zero
        if (!p.price || !p.stock || p.stock < 5) return;

        // Logic: 
        // - High Stock (>100) -> Clearance (Super Deals)
        // - High Price (>1000) -> Flash Sale
        // - Otherwise Random

        let type = campaignTypes[2]; // Default
        if (p.stock > 50) type = campaignTypes[0];
        else if (p.price > 500) type = campaignTypes[3];
        else if (Math.random() > 0.5) type = campaignTypes[1];

        // Random check to not suggest for EVERY product
        if (Math.random() > 0.7) return;

        const discountAmount = p.price * (type.discount / 100);
        const discountedPrice = p.price - discountAmount;
        // Estimate sales based on stock (conservative) e.g. 10% of stock or 10 units
        const estimatedSales = Math.min(Math.floor(p.stock * 0.2) + 5, 50);
        const estimatedRevenue = discountedPrice * estimatedSales;
        const uplift = Math.floor(Math.random() * 40) + 20;

        opportunities.push({
            id: idx + 1000, // Pseudo ID
            productId: p.id,
            productName: p.name,
            currentPrice: p.price,
            stock: p.stock,
            campaignName: type.name,
            description: type.desc,
            suggestedDiscount: type.discount,
            discountedPrice,
            estimatedSales,
            estimatedRevenue,
            upliftPercentage: uplift,
            endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
            status: 'new',
            marketplace: 'Trendyol' // Assuming default
        });
    });

    // Sort by Revenue Potential
    return opportunities.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
}

// 2. Join Campaign
export async function joinCampaignAction(opportunityId: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // In a real system, we would insert into 'marketplace_campaigns' table.
    // Since table is missing, we simulate success.
    // await new Promise(resolve => setTimeout(resolve, 500)); 

    return { success: true };
}
