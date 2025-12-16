import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'none';

export interface TenantAccess {
    status: SubscriptionStatus;
    planId: string;
    daysRemaining: number;
    isLocked: boolean;
    modules: string[]; // List of active module IDs
    planFeatures?: Record<string, any>; // JSON features
}

/**
 * Helper to resolve the effective Organization ID.
 * 1. Checks active Org (Clerk UI).
 * 2. Checks metadata (Custom set on invite).
 * 3. Fallback to userId (Personal account).
 */
export async function getOrganizationId(): Promise<string | null> {
    try {
        const { userId, orgId } = await auth();
        if (!userId) return null;
        if (orgId) return orgId;

        // Fallback: Check metadata for forced org context
        try {
            const user = await currentUser();
            const metaOrgId = user?.publicMetadata?.organization_id as string;
            if (metaOrgId) return metaOrgId;
        } catch (metaError) {
            console.error('currentUser() failed, falling back to userId:', metaError);
            // Metadata fetch failed, continue to userId fallback
        }

        return userId; // Personal scope
    } catch (error) {
        console.error('getOrganizationId failed:', error);
        return null;
    }
}

export async function getTenantAccess(): Promise<TenantAccess> {
    try {
        const orgId = await getOrganizationId();
        if (!orgId) return { status: 'none', planId: '', daysRemaining: 0, isLocked: true, modules: [] };

        const supabase = getSupabaseAdmin();

        // 1. Fetch Subscription (use maybeSingle to avoid errors)
        const { data: sub, error } = await supabase
            .from('saas_subscriptions')
            .select('*, saas_plans(*)')
            .eq('tenant_id', orgId)
            .maybeSingle();

        // Log error for debugging but don't throw
        if (error) {
            console.error('getTenantAccess subscription fetch error:', error);
            return { status: 'none', planId: '', daysRemaining: 0, isLocked: true, modules: [] };
        }

        // If no subscription record found, user is in "New" state.
        if (!sub) {
            return { status: 'none', planId: '', daysRemaining: 0, isLocked: true, modules: [] };
        }

        // 2. Calculate Status
        const now = new Date();
        const endDate = new Date(sub.current_period_end);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: SubscriptionStatus = sub.status as SubscriptionStatus;
        let isLocked = false;

        // Override status if date passed (and not already explicitly cancelled/failed)
        if (daysRemaining < 0 && status === 'active') { // Trial or Active
            status = 'past_due';
            isLocked = true;
        } else if (daysRemaining < 0 && status === 'trial') {
            status = 'past_due'; // Trial Expired
            isLocked = true;
        }

        if (status === 'canceled' || status === 'past_due') {
            isLocked = true;
        }

        // 3. Fetch Active Modules for this subscription
        const { data: modules } = await supabase
            .from('saas_subscription_modules')
            .select('module_id')
            .eq('subscription_id', sub.id);

        const moduleList = modules?.map(m => m.module_id) || [];

        return {
            status,
            planId: sub.plan_id,
            daysRemaining,
            isLocked,
            modules: moduleList,
            // @ts-ignore
            planFeatures: sub.saas_plans?.features || {}
        };
    } catch (error) {
        console.error('getTenantAccess fatal error:', error);
        // Return safe defaults on any error
        return { status: 'none', planId: '', daysRemaining: 0, isLocked: true, modules: [] };
    }
}

/**
 * Enforces subscription access.
 * If locked, redirects to payment page (unless already there).
 */
export async function enforceSubscription(currentPath: string) {
    const access = await getTenantAccess();

    // Whitelist paths that should ALWAYS be accessible even if locked
    const whitelist = [
        '/abonelik', // The billing page
        '/abonelik/odeme',
        '/abonelik/odeme/havale',
        '/yardim', // Can still ask for help?
        '/yardim/destek',
        '/admin' // Super admin shouldn't be locked by this logic ideally, but admin uses different layout usually?
        // Wait, our admin pages are under app/(admin), this check is usually for app/(dashboard).
        // We need to make sure we don't accidentally block Admin if they share logic.
    ];

    // Check if current path starts with any whitelist item
    const isWhitelisted = whitelist.some(path => currentPath.startsWith(path));

    if (access.isLocked && !isWhitelisted) {
        redirect('/abonelik?locked=true');
    }

    return access;
}

/**
 * Checks if the tenant has access to a specific feature module.
 */
export async function hasModuleAccess(moduleSlug: string): Promise<boolean> {
    try {
        const access = await getTenantAccess();
        if (access.isLocked) return false;
        return access.modules.includes(moduleSlug);
    } catch (error) {
        console.error('hasModuleAccess error:', error);
        return false; // Fail safe: deny access on error
    }
}

/**
 * Checks if the usage exceeds the plan limit.
 * Return true if allowed, false if limit reached.
 * If limit is -1 or undefined, it's unlimited.
 */
export async function checkLimit(limitKey: string, currentUsage: number): Promise<boolean> {
    const access = await getTenantAccess();
    // If locked, no writes allowed usually, but checkLimit might be used for read limits too?
    // Usually quotas block WRITES. 
    if (access.isLocked) return false;

    // Extract features from the joined plan
    // @ts-ignore
    const features = access.planFeatures || {};

    const limit = features[limitKey];

    // Undefined or null => Unlimited (or restrict? Default to Unlimited for now)
    if (limit === undefined || limit === null) return true;

    // -1 => Unlimited
    if (limit === -1) return true;

    if (currentUsage >= limit) {
        return false;
    }

    return true;
}

export async function getPlanLimits(): Promise<Record<string, number>> {
    const access = await getTenantAccess();
    // @ts-ignore
    return access.planFeatures || {};
}
