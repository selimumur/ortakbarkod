"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getTenantAccess } from "@/lib/accessControl";

export async function getPublicPlansAction() {
    const supabase = getSupabaseAdmin();
    // Public fetch of plans
    const { data } = await supabase.from('saas_plans').select('*').eq('is_active', true).order('price_monthly');
    return data || [];
}

export async function getSubscriptionDetailsAction() {
    const { userId } = await auth();
    if (!userId) return null;

    const access = await getTenantAccess();

    // Fetch full subscription detail if exists
    const supabase = getSupabaseAdmin();
    const { data: sub } = await supabase
        .from('saas_subscriptions')
        .select('*, saas_plans(*)')
        .eq('tenant_id', userId)
        .single();

    return {
        access,
        subscription: sub
    };
}
