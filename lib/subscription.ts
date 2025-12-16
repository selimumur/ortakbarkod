import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "./supabaseClient";
import { getPlanConfig, PlanConfig, DEFAULT_PLAN } from "./plans";

// Cache structure (optional, for now direct DB)

export async function getCurrentSubscription() {
    try {
        const { orgId } = await auth();
        if (!orgId) return null;

        const supabase = getSupabaseAdmin();
        // Get active subscription (use maybeSingle to avoid errors)
        const { data: sub, error } = await supabase
            .from('saas_subscriptions')
            .select('*')
            .eq('tenant_id', orgId)
            .eq('status', 'active')
            .gte('current_period_end', new Date().toISOString())
            .maybeSingle();

        if (error) {
            console.error('getCurrentSubscription error:', error);
            return null;
        }

        if (!sub) return null;

        return sub;
    } catch (error) {
        console.error('getCurrentSubscription fatal error:', error);
        return null;
    }
}

export async function getTenantPlan(): Promise<PlanConfig> {
    const sub = await getCurrentSubscription();
    // If no active sub, maybe return Starter trial or Restricted?
    // For now, if no sub, return Starter (Free Tier logic) or Restricted.
    // Let's assume Starter is the default "Free/Trial" state if mapped.
    // Or if undefined, we might need a 'free' plan with 0 limits?
    // User plan mentions "14 gün ücretsiz dene".
    // If no record, they might be in Trial if newly created?
    // Let's return Starter by default for now.
    return getPlanConfig(sub?.plan_id || 'starter');
}

export async function checkFeatureAccess(feature: keyof PlanConfig['features']): Promise<boolean> {
    const plan = await getTenantPlan();
    return plan.features[feature];
}

export async function checkLimit(resource: 'products' | 'users' | 'stores'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const { orgId } = await auth();
    if (!orgId) return { allowed: false, current: 0, limit: 0 };

    const plan = await getTenantPlan();
    const limit = plan.limits[resource];

    if (limit >= 999999) return { allowed: true, current: 0, limit }; // Unlimited

    const supabase = getSupabaseAdmin();
    let count = 0;

    if (resource === 'products') {
        const { count: c } = await supabase.from('master_products').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
        count = c || 0;
    } else if (resource === 'stores') {
        // Placeholder
        const { count: c } = await supabase.from('marketplace_integrations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
        count = c || 0;
    } else if (resource === 'users') {
        // Count users in Clerk? Or in profiles?
        // We verify via Factory Settings -> Users mapping? or Clerk directly.
        // It's hard to count Clerk users from Supabase without sync.
        // We will assume 'profiles' count in Supabase.
        const { count: c } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
        count = c || 0;
    }

    return {
        allowed: count < limit,
        current: count,
        limit
    };
}

export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'none';

export interface TenantAccess {
    status: SubscriptionStatus;
    planId: string;
    daysRemaining: number;
    isLocked: boolean;
    features: PlanConfig['features'];
}

export async function getTenantAccess(): Promise<TenantAccess> {
    try {
        const sub = await getCurrentSubscription();
        const planConfig = await getTenantPlan();

        if (!sub) {
            return {
                status: 'none',
                planId: 'starter',
                daysRemaining: 0,
                isLocked: false,
                features: planConfig.features
            };
        }

        const now = new Date();
        const endDate = new Date(sub.current_period_end);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: SubscriptionStatus = sub.status as SubscriptionStatus;
        let isLocked = false;

        if (sub.plan_id === 'starter') {
            isLocked = false;
        } else {
            if (daysRemaining < 0) {
                status = 'past_due';
                isLocked = true;
            }
        }

        if (status === 'canceled' || status === 'past_due') {
            isLocked = true;
        }

        // 3. Fetch Active Modules (Add-ons)
        const { orgId } = await auth();
        let modules: string[] = [];
        if (orgId) {
            try {
                const supabase = getSupabaseAdmin();
                const { data: activeMods, error } = await supabase
                    .from('saas_tenant_modules')
                    .select('module_id')
                    .eq('tenant_id', orgId)
                    .eq('status', 'active');

                if (!error && activeMods) {
                    modules = activeMods.map(m => m.module_id);
                }
            } catch (e) {
                console.error("Module Fetch Error:", e);
            }
        }

        // 4. Merge Features
        const finalFeatures = { ...planConfig.features };

        if (modules.includes('arbitraj')) finalFeatures.arbitrage = true;
        if (modules.includes('marketplace')) finalFeatures.marketplace = true;
        if (modules.includes('advanced_reports')) finalFeatures.advanced_reports = true;
        if (modules.includes('production')) finalFeatures.production = true;

        return {
            status,
            planId: sub.plan_id,
            daysRemaining,
            isLocked,
            features: finalFeatures
        };
    } catch (error) {
        console.error("getTenantAccess Fatal Error:", error);
        return {
            status: 'none',
            planId: 'starter',
            daysRemaining: 0,
            isLocked: false,
            features: DEFAULT_PLAN.features
        };
    }
}



import { redirect } from "next/navigation";

export async function enforceSubscription(currentPath: string) {
    const access = await getTenantAccess();

    // Whitelist paths
    const whitelist = [
        '/abonelik',
        '/abonelik/odeme',
        '/yardim',
        '/sign-in',
        '/sign-up'
    ];

    const isWhitelisted = whitelist.some(path => currentPath.startsWith(path));

    // 1. Check Locked Status (Past Due / Cancelled)
    if (access.isLocked && !isWhitelisted) {
        redirect('/abonelik?locked=true');
    }

    // 2. Check Feature Access based on Path
    // Map paths to feature keys
    if (currentPath.startsWith('/arbitraj') && !access.features.arbitrage) {
        redirect('/dashboard?error=upgrade_required');
    }

    if ((currentPath.startsWith('/pazaryeri') || currentPath.startsWith('/siparisler')) && !access.features.marketplace) {
        // Exclude some basic paths? No, assuming Marketplace module covers all sales channels.
        // Wait, 'siparisler' (Orders) might be basic?
        // Starter Plan: 'marketplace: false'.
        // Does Starter allows Manual Orders? 
        // Plans: Starter limit stores=0. 
        // If marketplace=false, maybe they can only use Manual Orders?
        // Let's check typical usage.
        // If 'marketplace' feature is strictly for API integrations, then 'siparisler' might be allowed if manual.
        // However, the `Sidebar` logic grouped '/siparisler' under "Sipariş Yönetimi".
        // Let's assume Starter CAN do manual orders but not Marketplace Integration.
        // But my 'marketplace' feature flag usually means "E-commerce features".
        // Let's restrict `/pazaryeri` strictly.
        if (currentPath.startsWith('/pazaryeri')) {
            redirect('/dashboard?error=upgrade_plan_marketplace');
        }
    }

    if (currentPath.startsWith('/muhasebe') && false) {
        // Example: If we had accounting feature flag. Everyone has accounting now.
    }

    return access;
}

