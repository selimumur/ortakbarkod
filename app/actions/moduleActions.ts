"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { adminAuth } from "@/lib/adminAuth";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/accessControl";

// --- PUBLIC / TENANT ACTIONS ---

export async function getModulesAction() {
    // Public fetch for marketplace
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('saas_modules')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true }); // Free/Cheap first? or by name
    return data || [];
}

export async function getTenantModulesAction() {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('saas_tenant_modules')
        .select('*, saas_modules(name, features)')
        .eq('tenant_id', orgId)
        .eq('status', 'active');

    return data || [];
}

export async function purchaseModuleAction(moduleId: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // 1. Check Module
    const { data: moduleData } = await supabase.from('saas_modules').select('*').eq('id', moduleId).single();
    if (!moduleData) throw new Error("Module not found");

    // 2. Check if already active
    const { data: existing } = await supabase
        .from('saas_tenant_modules')
        .select('*')
        .eq('tenant_id', orgId)
        .eq('module_id', moduleId)
        .eq('status', 'active')
        .single();

    if (existing) throw new Error("Modül zaten aktif.");

    // 3. Purchase Logic
    // If Price > 0, we might want to create a payment intent. 
    // For MVP, if Price > 0, we create a "pending" module record and notify admin / create transaction?
    // User requested "Satın al deyip paketini eklemeli".
    // Let's create a pending transaction if price > 0, OR just activate it directly if we trust the user (Admin request).
    // Let's implement logic: 
    // IF price == 0 -> Active
    // IF price > 0 -> Create Pending Payment Transaction (reusing payment tables) AND 'pending' module status.

    const price = Number(moduleData.price);

    if (price > 0) {
        // Create Payment Transaction
        // Assuming we rely on the manual bank transfer flow:
        // We return "Payment Required" status so UI opens the Payment Modal with this module selected.
        return { status: 'payment_required', module: moduleData };
    } else {
        // Free Module -> Activate
        const { error } = await supabase.from('saas_tenant_modules').upsert({
            tenant_id: orgId,
            module_id: moduleId,
            status: 'active',
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, module_id' });

        if (error) throw new Error(error.message);

        revalidatePath('/market');
        revalidatePath('/dashboard');
        return { success: true, status: 'activated' };
    }
}

// --- ADMIN ACTIONS ---

export async function getModulesAdminAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_modules').select('*').order('created_at', { ascending: false });
    return data || [];
}

export async function upsertModuleAction(data: { id: string, name: string, description: string, price: number, is_active: boolean, image_url?: string }) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('saas_modules').upsert({
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price,
        is_active: data.is_active,
        image_url: data.image_url,
        updated_at: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
    revalidatePath('/admin/modules');
    return { success: true };
}

export async function deleteModuleAction(id: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('saas_modules').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath('/admin/modules');
    return { success: true };
}
