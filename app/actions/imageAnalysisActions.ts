'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

export type ImageAnalysis = {
    id: number; // Product ID
    productId: number;
    productName: string;
    imageUrl: string;
    resolution: string;
    qualityScore: number;
    issues: string[];
    status: 'optimized' | 'needs_attention';
};

// 1. Get Analyzed Images (Simulated CV Analysis on Real Products)
export async function getAnalyzedImagesAction() {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = getSupabaseAdmin();

    // Fetch products that have images
    const { data: products } = await supabase
        .from('master_products')
        .select('id, name, image_url')
        .eq('organization_id', userId)
        .not('image_url', 'is', null)
        .limit(24);

    if (!products) return [];

    // Deterministic simulation of analysis based on Product ID
    return products.map((p: any) => {
        // Use ID to determine "random" qualities so it persists across reloads slightly
        const pseudoRandom = (p.id % 10) / 10;
        const isGood = pseudoRandom > 0.4;

        let score: number;
        let issues: string[] = [];
        let resolution = "1000x1000";

        if (isGood) {
            score = 80 + Math.floor(pseudoRandom * 20);
            resolution = "1200x1200";
        } else {
            score = 40 + Math.floor(pseudoRandom * 30);
            resolution = "500x500";
            if (score < 50) issues.push("Düşük Çözünürlük");
            if (p.name.length > 50) issues.push("Karmaşık Arkaplan"); // Arbitrary rule
        }

        return {
            id: p.id,
            productId: p.id,
            productName: p.name,
            imageUrl: p.image_url,
            resolution,
            qualityScore: score,
            issues: issues,
            status: (score > 75 && issues.length === 0) ? 'optimized' : 'needs_attention'
        };
    }).sort((a, b) => a.qualityScore - b.qualityScore); // Wost first
}

// 2. Encode/Enhance Image
export async function enhanceImageAction(productId: number, type: 'background' | 'upscale') {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // In a real app, this would call an external API (like replicate, openai, etc.)
    // and then update the 'image_url' in master_products or save a new version.

    // For this demo, we verify user exists and return success.

    return {
        success: true,
        newResolution: type === 'upscale' ? "2048x2048" : undefined,
        message: type === 'upscale' ? "Görsel 4x büyütüldü" : "Arkaplan temizlendi"
    };
}
