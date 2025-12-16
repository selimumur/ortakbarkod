"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { adminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// --- COMMON & TENANT ACTIONS ---

// Create a new ticket (Tenant)
// Create a new ticket (Tenant)
export async function createTicketAction(subject: string, message: string, attachments: string[] = []) {
    try {
        const { userId, orgId } = await auth(); // Tenant context
        if (!userId) return { success: false, error: "Oturum açmanız gerekiyor." };

        const supabase = getSupabaseAdmin();

        // Fallback to userId if orgId is missing (Personal account)
        const tenantId = orgId || userId;

        // 1. Create Ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                subject: subject,
                status: 'open',
                priority: 'normal'
            })
            .select()
            .single();

        if (ticketError) {
            console.error("Create Ticket Error:", ticketError);
            return { success: false, error: `Talep oluşturulamadı: ${ticketError.message}` };
        }

        // 2. Create Initial Message
        const { error: msgError } = await supabase
            .from('support_messages')
            .insert({
                ticket_id: ticket.id,
                sender_id: userId,
                message: message,
                attachments: attachments,
                is_admin_reply: false
            });

        if (msgError) {
            console.error("Create Message Error:", msgError);
            return { success: false, error: `Mesaj kaydedilemedi: ${msgError.message}` };
        }

        revalidatePath('/yardim/destek');
        revalidatePath('/admin/support'); // Notify admin
        return { success: true, ticketId: ticket.id };

    } catch (e) {
        console.error("Server Action Error:", e);
        return { success: false, error: "Beklenmedik bir sunucu hatası oluştu." };
    }
}

// Get Tenant's Tickets
export async function getTenantTicketsAction() {
    const { orgId } = await auth();
    if (!orgId) return [];

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('tenant_id', orgId)
        .order('updated_at', { ascending: false });

    if (error) console.error("Get Tickets Error:", error);
    return data || [];
}

// Get Ticket Details (Tenant secure check)
export async function getTicketDetailsAction(ticketId: number) {
    const { orgId, userId } = await auth();
    // Start with admin check? No, separate action for admin is better or shared with logic.
    // Let's make this hybrid or strictly tenant. This file is "supportActions", let's keep it mixed or separate.
    // I'll add logic: if adminAuth passes, allow. Else check orgId.

    // For simplicity, let's assume this is Tenant-facing primarily.
    // Admin usually needs more info (like Tenant Name).

    if (!orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: ticket } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.tenant_id !== orgId) throw new Error("Unauthorized access to ticket");

    const { data: messages } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    return { ticket, messages: messages || [] };
}

// Reply to Ticket (Tenant)
export async function replyTicketAction(ticketId: number, message: string, attachments: string[] = []) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: ticket } = await supabase.from('support_tickets').select('tenant_id').eq('id', ticketId).single();
    if (ticket?.tenant_id !== orgId) throw new Error("Unauthorized");

    // Insert Message
    const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message: message,
        attachments: attachments,
        is_admin_reply: false
    });

    if (error) throw new Error(error.message);

    // Update Ticket Status to 'open' if it was closed? Or just update 'updated_at'
    await supabase.from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', ticketId);

    revalidatePath(`/yardim/destek/${ticketId}`);
    revalidatePath('/admin/support');
    return { success: true };
}


// --- ADMIN ACTIONS ---

export async function getAdminTicketsAction(statusFilter?: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    let query = supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: tickets } = await query;

    // Enrich with Company Name (Factory Settings)
    // We need all unique tenant_ids
    if (!tickets?.length) return [];

    const tenantIds = Array.from(new Set(tickets.map(t => t.tenant_id)));
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('organization_id, company_info')
        .in('organization_id', tenantIds);

    const enriched = tickets.map(t => ({
        ...t,
        company_name: settings?.find(s => s.organization_id === t.tenant_id)?.company_info?.name || 'Bilinmiyor',
    }));

    return enriched;
}

export async function getAdminTicketDetailsAction(ticketId: number) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    const { data: ticket } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
    if (!ticket) return null;

    const { data: messages } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    // Fetch Tenant Info
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('company_info')
        .eq('organization_id', ticket.tenant_id)
        .single();

    return {
        ticket,
        messages: messages || [],
        company_name: settings?.company_info?.name || 'Bilinmiyor'
    };
}

export async function adminReplyTicketAction(ticketId: number, message: string, newStatus: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // Insert Message
    const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: 'ADMIN',
        message: message,
        is_admin_reply: true
    });

    if (error) throw new Error(error.message);

    // Update Ticket Status
    await supabase
        .from('support_tickets')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath('/admin/support');
    return { success: true };
}

// Special Widget Action
export async function getRecentUnansweredTicketsAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // Fetch last 10 open tickets
    const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!tickets?.length) return [];

    // Enrich
    const tenantIds = Array.from(new Set(tickets.map(t => t.tenant_id)));
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('organization_id, company_info')
        .in('organization_id', tenantIds);

    return tickets.map(t => ({
        ...t,
        company_name: settings?.find(s => s.organization_id === t.tenant_id)?.company_info?.name || 'Bilinmiyor',
    }));
}
