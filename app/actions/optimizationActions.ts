'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// --- HELPERS ---
function analyzeProduct(p: any) {
    const titleLength = p.name ? p.name.length : 0;

    // Description logic
    let desc = p.description || "";
    // If empty description, check raw_data
    if (!desc && p.raw_data && typeof p.raw_data === 'object' && 'description' in p.raw_data) {
        desc = p.raw_data.description || "";
    }
    const cleanDesc = desc.replace(/<[^>]*>?/gm, '');
    const descLength = cleanDesc.length;

    // Image logic
    let imgCount = 0;
    if (p.images && Array.isArray(p.images)) imgCount = p.images.length;
    else if (p.image_url) imgCount = 1;

    // Specs Logic
    // Access attributes safely
    const attributes = (p.raw_data && typeof p.raw_data === 'object' && 'attributes' in p.raw_data && Array.isArray(p.raw_data.attributes))
        ? p.raw_data.attributes
        : [];

    const hasBrand = attributes.some((a: any) => a.name && (a.name.toLowerCase() === 'marka' || a.name.toLowerCase() === 'brand'));

    let missingSpecsCount = 0;
    if (attributes.length < 3) missingSpecsCount = 3 - attributes.length;
    if (!hasBrand) missingSpecsCount += 1;

    // --- SCORING (Same algorithm as before) ---
    let score = 100;
    const issues = [];

    // 1. Title
    if (titleLength < 20) {
        score -= 20;
        issues.push('Başlık Çok Kısa');
    } else if (titleLength > 120) {
        score -= 5;
        issues.push('Başlık Çok Uzun');
    }

    // 2. Desc
    if (descLength < 50) {
        score -= 25;
        issues.push('Açıklama Yetersiz');
    } else if (descLength < 150) {
        score -= 10;
        issues.push('Açıklama Kısa');
    }

    // 3. Image
    if (imgCount === 0) {
        score -= 40;
        issues.push('Görsel Yok');
    } else if (imgCount < 3) {
        score -= 15;
        issues.push('Görsel Sayısı Az');
    }

    // 4. Specs
    if (missingSpecsCount > 0) {
        score -= (missingSpecsCount * 10);
        issues.push(`${missingSpecsCount} Eksik Özellik`);
    }

    score = Math.max(0, Math.min(100, score));

    let status: 'low' | 'medium' | 'high' = 'high';
    if (score < 50) status = 'low';
    else if (score < 80) status = 'medium';

    return {
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        stock: p.stock,
        price: p.price,
        titleLength,
        descLength,
        imageCount: imgCount,
        missingSpecs: missingSpecsCount,
        score,
        status,
        issues
    };
}

export async function getOptimizationAnalysisAction(search: string = "") {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Fetch critical fields
    let query = supabase
        .from('master_products')
        .select('id, name, image_url, stock, price, description, images, raw_data')
        .eq('organization_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const analyzed = data?.map(p => analyzeProduct(p)) || [];
    return analyzed;
}

export async function optimizeProductWithAIAction(productId: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Placeholder for AI integration
    // In a real app, this would call OpenAI/Gemini to rewrite title/desc

    // For now, let's just pretend we fixed it by updating last_optimized date or similar
    // Or just return a simulation

    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

    return {
        success: true,
        message: "AI Optimizasyonu kuyruğa alındı (Simülasyon)."
    };
}
