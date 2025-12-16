"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { adminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";

/**
 * Public: Fetch all active plans for the Pricing/Subscription page.
 */
export async function getPlansAction() {
    const supabase = getSupabaseAdmin();
    // Fetch active plans, ordered by price
    const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) {
        console.error("getPlansAction error:", error);
        return [];
    }

    return data || [];
}

/**
 * Admin: Fetch ALL plans (active + inactive) for management.
 */
export async function getAdminPlansAction() {
    await adminAuth(); // Protect
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        throw new Error(error.message);
    }
    return data || [];
}

/**
 * Admin: Create or Update a Plan.
 */
export async function upsertPlanAction(plan: any) {
    await adminAuth(); // Protect
    const supabase = getSupabaseAdmin();

    // Prepare data
    const planData = {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        price_yearly: plan.price_yearly || 0, // Add yearly price
        currency: plan.currency || 'TRY',
        features: plan.features || {},
        limits: plan.limits || {},
        is_active: plan.is_active !== undefined ? plan.is_active : true,
        is_popular: plan.is_popular !== undefined ? plan.is_popular : false,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('saas_plans')
        .upsert(planData);

    if (error) {
        console.error("upsertPlanAction Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/plans');
    revalidatePath('/abonelik'); // Update public page
    return { success: true };
}

/**
 * Admin: Delete a Plan.
 */
export async function deletePlanAction(planId: string) {
    await adminAuth(); // Protect
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('saas_plans')
        .delete()
        .eq('id', planId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/admin/plans');
    revalidatePath('/abonelik');
    return { success: true };
}
