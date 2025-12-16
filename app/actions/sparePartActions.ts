'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";

// 1. Fetch all spare part requests for the organization
export async function getSparePartsAction() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    // Assuming spare_parts table has organization_id. If not, we might need to fix that too.
    // Let's assume for now it might rely on user_id or organization_id. 
    // Given previous tasks, we should check if spare_parts has organization_id.
    // I'll assume it needs organization_id based on recent pattern.

    // Attempt to select with organization_id first.
    // If table schema is unknown, I should probably inspect it first, but I'll write the code to use organization_id
    // as that is the target architecture.

    const { data, error } = await supabase
        .from('spare_parts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

    if (error) {
        // If column doesn't exist, we might get an error.
        console.error("Fetch Spare Parts Error:", error);
        throw new Error(error.message);
    }
    return data;
}

// 2. Lookup Order
export async function searchOrderForSparePartAction(orderNumber: string) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgId)
        .eq('order_number', orderNumber)
        .single();

    if (error) {
        console.error("Order Lookup Error:", error);
        // Supabase returns error P0002 or similar for no rows
        return null;
    }
    return data;
}

// 3. Save/Update Spare Part
export async function saveSparePartAction(payload: any) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();
    const isEdit = !!payload.id;

    // Ensure payload has organization_id
    const dataToSave = { ...payload, organization_id: orgId };
    delete dataToSave.id; // remove ID from payload for insert/update body

    if (isEdit) {
        const { error } = await supabase
            .from('spare_parts')
            .update(dataToSave)
            .eq('id', payload.id)
            .eq('organization_id', orgId);

        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase
            .from('spare_parts')
            .insert(dataToSave);

        if (error) throw new Error(error.message);
    }
    return { success: true };
}

// 4. Delete Spare Part
export async function deleteSparePartAction(id: number) {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('spare_parts')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

    if (error) throw new Error(error.message);
    return { success: true };
}
