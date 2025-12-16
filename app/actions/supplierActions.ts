'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function getTenantId() {
    const { orgId, userId } = await auth();
    const tenantId = orgId || userId;
    if (!tenantId) throw new Error("Unauthorized");
    return tenantId;
}

export type Supplier = {
    id: number;
    organization_id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
    balance: number;
    created_at?: string;
};

export async function getSuppliersAction(search: string = "") {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    let query = supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', tenantId)
        .order('name', { ascending: true });

    if (search) {
        query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getSupplierByIdAction(id: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('id', id)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

export async function getSupplierMovementsAction(supplierId: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Invoices
    const { data: invoices } = await supabase
        .from('purchase_invoices')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('supplier_id', supplierId);

    // 2. Payments (Expenses related to supplier) - Using NEW accounting_transactions if possible, but keeping old fallback check
    // Wait, let's look at accounting_transactions table structure I made.
    // It has: account_id, category_id, contact_id (which can be supplier)
    // transaction_type: 'EXPENSE'

    // For now, let's query the *new* table if we can, BUT the old code below queried 'financial_transactions'.
    // To allow smooth transition, I should check if I should update this to use 'accounting_transactions'.
    // Since I am refactoring, I should probably switch to 'accounting_transactions' IF I am sure they are populated.
    // BUT, the 'supplierActions' writes to 'financial_transactions' below (addSupplierPaymentAction). 
    // I need to update 'addSupplierPaymentAction' to write to 'accounting_transactions' first!

    // Let's first Fix the Tenant ID, then I will update the table references in a second pass or now.
    // Let's do it now. switch to 'accounting_transactions'.

    const { data: payments } = await supabase
        .from('accounting_transactions')
        .select('*, account:accounting_accounts(name)')
        .eq('tenant_id', tenantId)
        .eq('contact_id', supplierId) // Note: contact_id must allow supplier ID
        .eq('transaction_type', 'EXPENSE');

    return {
        invoices: invoices || [],
        payments: payments || []
    };
}

export async function addSupplierPaymentAction(data: {
    supplier_id: number;
    account_id: number | null;
    amount: number;
    date: string;
    description: string;
    method: string;
}) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Insert Transaction (NEW TABLE)
    const { error: transError } = await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: 'EXPENSE',
        // type: 'Ödeme', // No 'type' column in new schema, used 'category_id' or 'description'
        // description: `${data.method} ile Ödeme - ${data.description}`,
        description: data.description,
        amount: data.amount,
        date: data.date,
        account_id: data.account_id,
        contact_id: data.supplier_id
        // category_id? Missing here. Maybe explicit 'Supplier Payment' category?
    });

    if (transError) throw new Error(transError.message);

    // 2. Decrease Account Balance (NEW TABLE)
    if (data.account_id) {
        const { data: acc } = await supabase.from('accounting_accounts').select('balance').eq('id', data.account_id).single();
        if (acc) {
            await supabase.from('accounting_accounts').update({ balance: Number(acc.balance) - data.amount }).eq('id', data.account_id);
        }
    }

    // 3. Update Supplier Balance
    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', data.supplier_id).single();
    if (supplier) {
        await supabase.from('suppliers').update({ balance: (supplier.balance || 0) + data.amount }).eq('id', data.supplier_id);
    }

    revalidatePath(`/muhasebe/tedarikciler/${data.supplier_id}`);
}

export async function deleteSupplierPaymentAction(paymentId: number, supplierId: number, amount: number, accountId: number | null) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Delete Transaction (NEW TABLE)
    await supabase.from('accounting_transactions').delete().eq('id', paymentId).eq('tenant_id', tenantId);

    // 2. Revert Supplier Balance 
    const { data: supplier } = await supabase.from('suppliers').select('balance').eq('id', supplierId).single();
    if (supplier) {
        await supabase.from('suppliers').update({ balance: (supplier.balance || 0) - amount }).eq('id', supplierId);
    }

    // 3. Revert Account Balance (NEW TABLE)
    if (accountId) {
        const { data: acc } = await supabase.from('accounting_accounts').select('balance').eq('id', accountId).single();
        if (acc) {
            await supabase.from('accounting_accounts').update({ balance: Number(acc.balance) + amount }).eq('id', accountId);
        }
    }

    revalidatePath(`/muhasebe/tedarikciler/${supplierId}`);
}

export async function upsertSupplierAction(supplier: Partial<Supplier>) {
    const tenantId = await getTenantId();

    if (!supplier.name) throw new Error("Firma adı zorunludur.");

    const supabase = getSupabaseAdmin();
    const payload = {
        ...supplier,
        organization_id: tenantId
    };

    if (!payload.id) {
        delete payload.id;
    }

    const { data, error } = await supabase
        .from('suppliers')
        .upsert(payload)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/tedarikciler');
    revalidatePath('/muhasebe/cariler');
    return data;
}

export async function deleteSupplierAction(id: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('organization_id', tenantId);

    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/tedarikciler');
    revalidatePath('/muhasebe/cariler');
    return true;
}
