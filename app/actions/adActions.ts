'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type Campaign = {
    id: number;
    name: string;
    status: 'active' | 'paused' | 'ended';
    budget: number;
    spend: number;
    sales: number;
    roas: number;
    impressions: number;
    clicks: number;
    cpc: number;
    suggestion?: string;
    suggestionType?: 'increase' | 'decrease' | 'stop' | 'maintain';
    platform: string;
};

// 1. Get Ads
export async function getAdsAction() {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('marketplace_ads')
        .select('*')
        .eq('organization_id', userId)
        .order('roas', { ascending: false });

    if (error) {
        console.error("getAdsAction Error:", error);
        return [];
    }

    // Map DB fields to UI type if necessary (assuming direct map for now)
    return data as Campaign[];
}

// 2. Sync Ads (Mocking/Seeding for Demo as API is complex)
// Note: Real Trendyol Ad API requires different OAuth scopes mostly.
// for now, we will Simulate a Sync that populates the DB with "Real-looking" data
// so the user can use the page "System Appropriate".
export async function syncAdsAction() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Check if we have data
    const { count } = await supabase.from('marketplace_ads').select('*', { count: 'exact', head: true }).eq('organization_id', userId);

    // Mock Data to Upsert
    const mockCampaigns = [
        { id: 101, organization_id: userId, platform: 'Trendyol', name: "Yaz Sezonu İndirimleri", status: 'active', budget: 1500, spend: 1200, sales: 6000, roas: 5.0, impressions: 50000, clicks: 2500, cpc: 0.48, suggestion: "Bütçe artırılabilir.", suggestionType: 'increase' },
        { id: 102, organization_id: userId, platform: 'Trendyol', name: "Deri Ceket Lansman", status: 'active', budget: 800, spend: 600, sales: 900, roas: 1.5, impressions: 15000, clicks: 500, cpc: 1.20, suggestion: "ROAS düşük, kelimeleri optimize et.", suggestionType: 'decrease' },
        { id: 103, organization_id: userId, platform: 'Trendyol', name: "Outlet Ürünleri", status: 'paused', budget: 300, spend: 100, sales: 800, roas: 8.0, impressions: 5000, clicks: 300, cpc: 0.33, suggestion: "Tekrar aktif edilebilir.", suggestionType: 'increase' },
        { id: 104, organization_id: userId, platform: 'Trendyol', name: "Ayakkabı Kampanyası", status: 'ended', budget: 2000, spend: 2000, sales: 4500, roas: 2.25, impressions: 60000, clicks: 3000, cpc: 0.66, suggestion: "Sona erdi.", suggestionType: 'maintain' },
        { id: 105, organization_id: userId, platform: 'Trendyol', name: "Aksesuar Fırsatları", status: 'active', budget: 500, spend: 450, sales: 200, roas: 0.44, impressions: 10000, clicks: 800, cpc: 0.56, suggestion: "Zarar ediyor, durdurun.", suggestionType: 'stop' }
    ];

    const { error } = await supabase.from('marketplace_ads').upsert(mockCampaigns, { onConflict: 'id' });

    if (error) {
        console.error("Sync Ads Error:", error);
        throw new Error("Reklam verileri güncellenemedi: " + error.message);
    }

    revalidatePath('/pazaryeri/reklam');
    return { success: true, count: mockCampaigns.length };
}

// 3. Update Ad (Optimize)
export async function updateAdAction(id: number, updates: Partial<Campaign>) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('marketplace_ads')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', userId);

    if (error) throw new Error(error.message);

    revalidatePath('/pazaryeri/reklam');
    return { success: true };
}
