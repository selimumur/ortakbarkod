'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

export type SellerMetric = {
    name: string;
    score: number;
    status: 'high' | 'medium' | 'low';
    desc: string;
};

export type ScoreSuggestion = {
    title: string;
    impact: string;
    desc: string;
    type: 'critical' | 'warning' | 'info';
};

export type SellerScoreData = {
    overallScore: number;
    metrics: SellerMetric[];
    suggestions: ScoreSuggestion[];
    storeName: string;
};

// Get Seller Score (Simulated based on Real Accounts)
export async function getSellerScoreAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = getSupabaseAdmin();

    // Fetch real stores
    const { data: accounts } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('organization_id', orgId);

    if (!accounts || accounts.length === 0) {
        return null; // No store connected
    }

    // Simulate score based on store names/count (Determinism)
    // If we had real review data, we would aggregate marketplace_reviews here.
    const primaryStore = accounts[0];
    const baseScore = 8.5 + (accounts.length * 0.2); // More stores = slightly better score bonus logic?
    const overallScore = Math.min(9.9, Math.max(0, baseScore + (primaryStore.id % 10) / 10)); // Pseudo-random based on ID

    // Generate Metrics
    const metrics: SellerMetric[] = [
        { name: "Kargoya Veriliş Hızı", score: 9.8, status: 'high', desc: "Ortalama 14 saat" },
        { name: "Paketleme Özeni", score: 8.5, status: 'medium', desc: "Son 5 yorumda 2 şikayet" },
        { name: "Müşteri İletişimi", score: 9.9, status: 'high', desc: "Yanıt süresi < 15dk" },
        { name: "İade Oranı", score: 9.0, status: 'high', desc: "%3 seviyesinde" },
    ];

    // Generate Suggestions
    const suggestions: ScoreSuggestion[] = [
        { title: "Paketlemeyi İyileştirin", impact: "+0.3 Puan", desc: "Son dönemde 'kutu ezik geldi' şikayetleri arttı. Kargo poşeti yerine kutu kullanımına geçmeyi değerlendirin.", type: 'critical' },
        { title: "Kör Nokta Analizi", impact: "+0.1 Puan", desc: "İade nedenleri arasında 'Beden Uymadı' öne çıkıyor. Beden tablolarını güncelleyin.", type: 'warning' },
    ];

    return {
        overallScore: Number(overallScore.toFixed(1)),
        metrics,
        suggestions,
        storeName: primaryStore.store_name || "Mağazam"
    } as SellerScoreData;
}
