"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { adminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

// --- DASHBOARD STATS ---
export async function getAdminStatsAction() {
    await adminAuth(); // Security Check

    const supabase = getSupabaseAdmin();

    // 1. Total Tenants (Distinct Organization IDs in Subscriptions or Users tables)
    // Since we don't have a strict 'tenants' table, we might count unique organization_ids in 'users' or 'subscriptions'
    // Let's assume 'saas_subscriptions' is the source of truth for "Active Tenants"
    const { count: tenantCount, error: tenantError } = await supabase
        .from('saas_subscriptions')
        .select('*', { count: 'exact', head: true });

    // 2. Total Revenue
    const { data: payments, error: paymentError } = await supabase
        .from('saas_payments')
        .select('amount')
        .eq('status', 'paid');

    const totalRevenue = payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    // 3. User Count (Total Users across all tenants)
    // Note: Clerk handles users, but if we sync them to a 'users' table or if we just want a rough count from Clerk (we can't call clerk client easily here without secret key usage which is fine in server action)
    // For now, let's assume we have a 'users' or 'profiles' table in Supabase if we synced them. 
    // If not, we might return 0 or implement Clerk SDK call.
    // Let's use 'customers' table count as a proxy for "End Customers" or just return 0 for now until Clerk Sync is confirmed.
    // ACTUALLY, usually we don't sync all Clerk users to a single DB table unless implemented.
    // Let's mock User Count or fetch from Clerk if possible.
    // For MVP efficiency, let's skip User Count or use a placeholder.

    // 4. Recent Signups (Enriched)
    const { data: recentSubs } = await supabase
        .from('saas_subscriptions')
        .select('tenant_id, start_date, status, plan_id, current_period_end')
        .order('created_at', { ascending: false })
        .limit(5);

    // Enrich with Company Name
    const tenantIds = recentSubs?.map(s => s.tenant_id) || [];

    // Fetch Company Info & Profiles
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('organization_id, company_info')
        .in('organization_id', tenantIds);

    const { data: profiles } = await supabase
        .from('profiles')
        .select('organization_id, full_name')
        .in('organization_id', tenantIds);

    const enrichedSignups = recentSubs?.map(sub => {
        const company = settings?.find(s => s.organization_id === sub.tenant_id)?.company_info;
        const profile = profiles?.find(p => p.organization_id === sub.tenant_id);

        return {
            ...sub,
            company_name: company?.name || 'Bilinmiyor',
            contact_name: profile?.full_name || sub.tenant_id,
        };
    });

    return {
        totalRevenue,
        activeTenants: tenantCount || 0,
        totalUsers: 0, // Placeholder
        recentSignups: enrichedSignups || [],
        systemHealth: 100
    };
}

// --- TENANT MANAGEMENT ---
// --- TENANT MANAGEMENT ---
export async function getTenantsAction(filters?: {
    search?: string;
    status?: string;
    expiringIn?: '10_days' | '30_days' | 'expired';
}) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // 1. Get official subscriptions
    let subQuery = supabase
        .from('saas_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

    // Note: Date Logic for subscriptions is better applied in memory if mixed with "Detected" logic, 
    // BUT "Detected" tenants have NO expiration date (null).
    // So "Expiring" filters inherently exclude "Detected" (legacy) tenants unless we assign them a fake expiration.
    // For now, we will filter in memory to keep it simple and unified.

    const { data: subs, error: subError } = await subQuery;

    if (subError) throw new Error(subError.message);

    let detectedTenants: any[] = [];

    // 2. Discover "Legacy" or "Unregistered" tenants (Only if filtering allows 'detected' or 'all')
    if (!filters?.status || filters.status === 'detected' || filters.status === 'all') {
        // Check Products
        const { data: products } = await supabase
            .from('products')
            .select('organization_id')
            .not('organization_id', 'is', null);

        // Check Customers
        const { data: customers } = await supabase
            .from('customers')
            .select('organization_id')
            .not('organization_id', 'is', null);

        // Check Orders
        const { data: orders } = await supabase
            .from('orders')
            .select('organization_id')
            .not('organization_id', 'is', null);

        const distinctOrgs = new Set([
            ...(products?.map(p => p.organization_id) || []),
            ...(customers?.map(c => c.organization_id) || []),
            ...(orders?.map(o => o.organization_id) || [])
        ]);

        const subscribedOrgs = new Set(subs?.map(s => s.tenant_id) || []);

        detectedTenants = Array.from(distinctOrgs)
            .filter(orgId => !subscribedOrgs.has(orgId))
            .map(orgId => ({
                id: `legacy_${orgId}`,
                tenant_id: orgId,
                plan_id: 'legacy',
                status: 'detected',
                start_date: new Date().toISOString(), // Mock "Now"
                current_period_end: null,
                is_manual: false
            }));
    }

    const allTenants = [...(subs || []), ...detectedTenants];

    // 3. Metadata Fetching
    const { data: settings } = await supabase.from('factory_settings').select('organization_id, company_info');
    const { data: profiles } = await supabase.from('profiles').select('organization_id, full_name, email, phone');

    // 4. Enrich & Filter
    let enriched = allTenants.map(t => {
        const company = settings?.find(s => s.organization_id === t.tenant_id)?.company_info;
        const profile = profiles?.find(p => p.organization_id === t.tenant_id);

        return {
            ...t,
            company_name: company?.name || 'Bilinmiyor',
            contact_name: profile?.full_name || 'Bilinmiyor',
            contact_email: profile?.email || company?.email || '-',
            contact_phone: profile?.phone || company?.phone || '-'
        };
    });

    // Final Memory Filter
    if (filters) {
        if (filters.status && filters.status !== 'all') {
            enriched = enriched.filter(t => t.status === filters.status);
        }
        if (filters.search) {
            const lower = filters.search.toLowerCase();
            enriched = enriched.filter(t =>
                t.tenant_id.toLowerCase().includes(lower) ||
                t.company_name.toLowerCase().includes(lower) ||
                t.contact_name.toLowerCase().includes(lower) ||
                (typeof t.company_info?.tax_number === 'string' && t.company_info.tax_number.includes(lower))
            );
        }

        // Expiration Logic
        if (filters.expiringIn) {
            const now = new Date();
            enriched = enriched.filter(t => {
                if (!t.current_period_end) return false; // Infinite duration
                const end = new Date(t.current_period_end);

                if (filters.expiringIn === 'expired') {
                    return end < now;
                } else if (filters.expiringIn === '10_days') {
                    const diffTime = end.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 10;
                } else if (filters.expiringIn === '30_days') {
                    const diffTime = end.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30;
                }
                return true;
            });
        }
    }

    return enriched;
}

export async function createManualSubscriptionAction(tenantId: string, planId: string, durationDays: number) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        const subscriptionData = {
            tenant_id: tenantId,
            plan_id: planId,
            status: 'active',
            start_date: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            is_manual: true
        };

        // Check if subscription exists
        const { data: existing } = await supabase
            .from('saas_subscriptions')
            .select('id')
            .eq('tenant_id', tenantId)
            .single();

        let error;

        if (existing) {
            const { error: updateError } = await supabase
                .from('saas_subscriptions')
                .update(subscriptionData)
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('saas_subscriptions')
                .insert(subscriptionData);
            error = insertError;
        }

        if (error) throw new Error(error.message);
        revalidatePath('/admin/tenants');
        return { success: true };

    } catch (e: any) {
        console.error("Manual Subscription Error:", e);
        return { success: false, error: e.message };
    }
}

// --- MANUAL USER CREATION ---

export async function createManualUserAction(data: {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    planId: string;
    durationDays: number;
}) {
    await adminAuth(); // Ensure admin
    const supabase = getSupabaseAdmin();

    try {
        // 1. Create User in Clerk
        const clerk = await clerkClient();
        const user = await clerk.users.createUser({
            emailAddress: [data.email],
            password: data.password,
            firstName: data.fullName.split(' ')[0],
            lastName: data.fullName.split(' ').slice(1).join(' '),
            publicMetadata: {
                role: 'admin', // Default role for new tenant owner
            }
        });

        const userId = user.id;

        // 2. Create Profile in Supabase
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                organization_id: userId, // Self-hosted org style
                full_name: data.fullName,
                email: data.email,
                role: 'admin'
            });

        if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

        // 3. Create Factory Settings (Company Info)
        const { error: settingsError } = await supabase
            .from('factory_settings')
            .insert({
                organization_id: userId,
                company_info: {
                    name: data.companyName,
                    email: data.email,
                    tax_number: '',
                    tax_office: '',
                    address: '',
                    phone: '',
                    website: ''
                }
            });

        if (settingsError) throw new Error(`Settings Error: ${settingsError.message}`);

        // 4. Create Subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + data.durationDays);

        const { error: subError } = await supabase
            .from('saas_subscriptions')
            .insert({
                tenant_id: userId,
                plan_id: data.planId,
                status: 'active',
                start_date: startDate.toISOString(),
                current_period_end: endDate.toISOString(),
                is_manual: true
            });

        if (subError) throw new Error(`Subscription Error: ${subError.message}`);

        revalidatePath('/admin/tenants');
        return { success: true, userId: userId };

    } catch (e: any) {
        console.error("Manual User Creation Error:", e);
        // Better error message for existing users
        if (e.errors && e.errors[0]?.code === 'form_identifier_exists') {
            return { success: false, error: "Bu e-posta adresi zaten kullanımda." };
        }
        return { success: false, error: e.message || "Bir hata oluştu." };
    }
}

// --- PLAN & MODULE MANAGEMENT ---

export async function getPlansAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_plans').select('*').order('price_monthly');
    return data || [];
}

export async function upsertPlanAction(plan: any) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('saas_plans').upsert(plan);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/plans');
    return { success: true };
}

export async function getModulesAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_modules').select('*').order('name');
    return data || [];
}

export async function upsertModuleAction(module: any) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('saas_modules').upsert(module);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/modules');
    return { success: true };
}

export async function getPlanModuleRulesAction(planId: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('saas_plan_module_rules')
        .select('*, saas_modules(name)')
        .eq('plan_id', planId);
    return data || [];
}

export async function upsertPlanModuleRuleAction(rule: any) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    // Unique constraint on plan_id, module_id handles upsert
    const { error } = await supabase.from('saas_plan_module_rules').upsert(rule, { onConflict: 'plan_id, module_id' });
    if (error) throw new Error(error.message);
    revalidatePath('/admin/plans');
    return { success: true };
}

export async function deletePlanModuleRuleAction(id: number) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('saas_plan_module_rules').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/plans');
    return { success: true };
}

// --- TENANT DETAIL MANAGEMENT ---

export async function getTenantDetailsAction(tenantId: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // 1. Company Info
    const { data: companySettings } = await supabase
        .from('factory_settings')
        .select('*')
        .eq('organization_id', tenantId)
        .single();

    // 2. Profile (Primary Contact)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', tenantId)
        .single(); // Assuming 1-to-1 or taking first

    // 3. Current Subscription
    const { data: subscription } = await supabase
        .from('saas_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // 4. Payment History (Optional - Limit 5)
    const { data: payments } = await supabase
        .from('saas_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        tenant_id: tenantId,
        company: companySettings?.company_info || {},
        profile: profile || {},
        subscription: subscription || null,
        payments: payments || []
    };
}

export async function updateTenantSubscriptionAction(tenantId: string, data: any) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // Upsert subscription
    const { error } = await supabase
        .from('saas_subscriptions')
        .upsert({
            tenant_id: tenantId,
            ...data,
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' }); // Note: This might need ID if multiple subs exist, but usually we manage 1 active per tenant.
    // Actually, schema uses ID. We should probably update via ID if provided.

    // Better logic: Fetch active sub, update it. OR insert new if explicit "New Sub".
    // For simplicity of "Manage", let's assume we update the LATEST subscription.

    if (error) throw new Error(error.message);
    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath('/admin/tenants');
    return { success: true };
}
// --- BANK ACCOUNT MANAGEMENT ---

export async function getBankAccountsAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_bank_accounts').select('*').order('created_at', { ascending: false });
    return data || [];
}

export async function upsertBankAccountAction(data: any) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('saas_bank_accounts')
        .upsert(data);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/settings');
    return { success: true };
}

export async function deleteBankAccountAction(id: number) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('saas_bank_accounts')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/admin/settings');
    return { success: true };
}

export async function manualSubscriptionGrantAction(tenantId: string, planId: string, days: number, note: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const { data: existingSub } = await supabase.from('saas_subscriptions').select('id').eq('tenant_id', tenantId).single();

    if (existingSub) {
        await supabase.from('saas_subscriptions').update({
            plan_id: planId,
            status: 'active',
            is_manual: true,
            current_period_end: endDate.toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', existingSub.id);
    } else {
        await supabase.from('saas_subscriptions').insert({
            tenant_id: tenantId,
            plan_id: planId,
            status: 'active',
            is_manual: true,
            start_date: new Date().toISOString(),
            current_period_end: endDate.toISOString()
        });
    }

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath('/admin/tenants');
    return { success: true };
}

export async function syncClerkUsersAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const clerk = await clerkClient();

    try {
        const { data: users } = await clerk.users.getUserList({ limit: 100 });
        let syncedCount = 0;

        for (const user of users) {
            const userId = user.id;
            const email = user.emailAddresses[0]?.emailAddress;
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

            if (!email) continue;

            // 1. Sync Profile
            await supabase.from('profiles').upsert({
                id: userId,
                organization_id: userId,
                full_name: fullName,
                email: email,
                avatar_url: user.imageUrl,
                updated_at: new Date().toISOString()
            });

            // 2. Ensure Subscription Exists
            const { data: sub } = await supabase.from('saas_subscriptions').select('id').eq('tenant_id', userId).single();
            if (!sub) {
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 14); // 14 Day Trial

                await supabase.from('saas_subscriptions').insert({
                    tenant_id: userId,
                    plan_id: 'starter',
                    status: 'trial',
                    start_date: startDate.toISOString(),
                    current_period_end: endDate.toISOString(),
                    is_manual: false
                });
            }

            // 3. Ensure Factory Settings Exist
            const { data: settings } = await supabase.from('factory_settings').select('id').eq('organization_id', userId).single();
            if (!settings) {
                await supabase.from('factory_settings').insert({
                    organization_id: userId,
                    company_info: {
                        name: `${fullName} (Kişisel)`,
                        email: email,
                        phone: ''
                    }
                });
            }

            syncedCount++;
        }

        revalidatePath('/admin/tenants');
        return { success: true, message: `${syncedCount} kullanıcı senkronize edildi.` };
    } catch (e: any) {
        console.error("Sync Error:", e);
        return { success: false, error: e.message };
    }
}

// --- SYSTEM SETTINGS (Global Config) ---

export async function getSystemSettingAction(key: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_system_settings').select('value').eq('key', key).single();
    return data?.value || '';
}

export async function updateSystemSettingAction(key: string, value: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // Upsert
    const { error } = await supabase.from('saas_system_settings').upsert({
        key: key,
        value: value,
        updated_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);

    revalidatePath('/admin/settings');
    revalidatePath('/dashboard'); // Update user dashboard
    return { success: true };
}
