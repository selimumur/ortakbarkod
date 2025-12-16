"use server";

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { adminAuth } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

// --- TENANT ACTIONS ---

export async function createPaymentNotificationAction(amount: number, currency: string, planId: string, months: number, receiptUrl: string) {
    const { userId, orgId } = await auth();
    const tenantId = orgId || userId;

    if (!userId || !tenantId) throw new Error("Unauthorized");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
        .from('saas_payment_transactions')
        .insert({
            tenant_id: tenantId,
            amount,
            currency,
            plan_id: planId,
            months,
            receipt_url: receiptUrl,
            status: 'pending',
            payment_method: 'bank_transfer'
        });

    if (error) throw new Error(error.message);

    revalidatePath('/ayarlar/abonelik');
    revalidatePath('/admin/payments'); // Notify admin
    return { success: true };
}

export async function getTenantSubscriptionAction() {
    const { orgId, userId } = await auth();
    const tenantId = orgId || userId;

    if (!tenantId) return null;
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_subscriptions').select('*').eq('tenant_id', tenantId).single();
    return data;
}

export async function getPublicBankAccountsAction() {
    // Public/Tenant accessible
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('saas_bank_accounts').select('*').eq('is_active', true);
    return data || [];
}

// --- ADMIN ACTIONS ---

export async function getPendingPaymentsAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // Fetch pending payments
    const { data: payments } = await supabase
        .from('saas_payment_transactions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (!payments?.length) return [];

    // Enrich with Tenant Name
    const tenantIds = Array.from(new Set(payments.map(p => p.tenant_id)));
    const { data: settings } = await supabase
        .from('factory_settings')
        .select('organization_id, company_info')
        .in('organization_id', tenantIds);

    return payments.map(p => ({
        ...p,
        company_name: settings?.find(s => s.organization_id === p.tenant_id)?.company_info?.name || 'Bilinmiyor',
    }));
}

export async function approvePaymentAction(transactionId: number) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // 1. Get Transaction
    const { data: transaction } = await supabase.from('saas_payment_transactions').select('*').eq('id', transactionId).single();
    if (!transaction) throw new Error("Transaction not found");
    if (transaction.status !== 'pending') throw new Error("Transaction is not pending");

    const { tenant_id, plan_id, months } = transaction;

    // 2. Update Subscription
    // Check if subscription exists
    const { data: sub } = await supabase.from('saas_subscriptions').select('*').eq('tenant_id', tenant_id).single();

    let newEndDate = new Date();
    if (sub && sub.current_period_end && new Date(sub.current_period_end) > new Date()) {
        // Extend existing
        newEndDate = new Date(sub.current_period_end);
    }

    // Add months
    newEndDate.setMonth(newEndDate.getMonth() + (months || 1));

    if (sub) {
        await supabase.from('saas_subscriptions').update({
            plan_id: plan_id, // Upgrade if different
            status: 'active',
            current_period_end: newEndDate.toISOString(),
            updated_at: new Date().toISOString()
        }).eq('id', sub.id);
    } else {
        // Create new (should not happen usually as manual create does it, but safety net)
        await supabase.from('saas_subscriptions').insert({
            tenant_id,
            plan_id,
            status: 'active',
            start_date: new Date().toISOString(),
            current_period_end: newEndDate.toISOString()
        });
    }

    // 3. Mark Transaction as Approved
    await supabase.from('saas_payment_transactions').update({
        status: 'approved',
        updated_at: new Date().toISOString()
    }).eq('id', transactionId);

    revalidatePath('/admin/payments');
    revalidatePath('/admin/tenants');
    return { success: true };
}

export async function rejectPaymentAction(transactionId: number, note: string) {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    await supabase.from('saas_payment_transactions').update({
        status: 'rejected',
        admin_note: note,
        updated_at: new Date().toISOString()
    }).eq('id', transactionId);

    revalidatePath('/admin/payments');
    return { success: true };
}
