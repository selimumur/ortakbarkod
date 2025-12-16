"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

/**
 * Fetches the global broadcast message.
 * Publicly accessible (authenticated users).
 */
export async function getBroadcastMessageAction() {
    const supabase = getSupabaseAdmin();
    // Using admin client to bypass RLS since system settings are global/system-level
    // and we only select the broadcast key.

    const { data } = await supabase
        .from('saas_system_settings')
        .select('value')
        .eq('key', 'broadcast_message')
        .single();

    return { message: data?.value || '' };
}

/**
 * Fetches specific factory settings for the current user/tenant.
 * Used for Notifications, Company Info, etc.
 */
export async function getFactorySettingsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return null;

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('factory_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single();

    return data;
}

/**
 * Updates factory settings (specifically notification config).
 */
export async function saveFactorySettingsAction(config: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('factory_settings')
        .update({ notification_config: config, updated_at: new Date().toISOString() })
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    return { success: true };
}

/**
 * Fetches materials list for the product/recipe builder.
 */
export async function getMaterialsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    // Trying 'materials' table first based on productionActions usage
    const { data } = await supabase
        .from('materials')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

    return data || [];
}

/**
 * Checks for new orders created after a specific time.
 * Used for polling notifications.
 */
export async function checkNewOrdersAction(lastChecked: string) {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgId)
        .gt('created_at', lastChecked)
        .order('created_at', { ascending: true });

    return data || [];
}
