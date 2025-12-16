'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Local helper removed, using centralized accessControl
import { getOrganizationId } from "@/lib/accessControl";

// Helper wrapper to throw if unauthorized
async function getTenantId() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    return orgId;
}

export type Customer = {
    name: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string;
    platform?: string;
};

export async function getCustomersAction(search: string = ""): Promise<Customer[]> {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // Fetch orders to aggregate customer data
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!orders) return [];

    const customerMap = new Map<string, Customer>();

    orders.forEach((order: any) => {
        const name = order.customer_name?.trim() || "İsimsiz Müşteri";

        if (!customerMap.has(name)) {
            customerMap.set(name, {
                name: name,
                phone: order.raw_data?.shipmentAddress?.phone || "-",
                email: order.customer_email || "-",
                city: order.raw_data?.shipmentAddress?.city || "-",
                address: order.raw_data?.shipmentAddress?.fullAddress || "-",
                totalSpent: 0,
                orderCount: 0,
                lastOrderDate: order.order_date || new Date().toISOString(),
                platform: order.platform
            });
        }

        const current = customerMap.get(name)!;
        current.totalSpent += Number(order.total_price || order.price || 0);
        current.orderCount += 1;

        if (order.order_date && new Date(order.order_date) > new Date(current.lastOrderDate)) {
            current.lastOrderDate = order.order_date;
            current.address = order.raw_data?.shipmentAddress?.fullAddress || current.address;
            current.phone = order.raw_data?.shipmentAddress?.phone || current.phone;
        }
    });

    let result = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

    if (search) {
        const lowerSearch = search.toLowerCase();
        result = result.filter(c =>
            c.name.toLowerCase().includes(lowerSearch) ||
            c.phone.includes(search)
        );
    }

    return result;
}

export async function getCustomerOrderHistoryAction(customerName: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('customer_name', customerName)
        .order('order_date', { ascending: false });

    return orders || [];
}

// --- ACCOUNTING / MANUEL CUSTOMER ACTIONS ---
// Used in the Accounting module (Muhasebe) for explicit B2B customer management

export type AccountingCustomer = {
    id: number;
    organization_id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    balance: number;
    created_at?: string;
};

export async function getAccountingCustomersAction(search: string = "") {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    let query = supabase
        .from('customers')
        .select('*')
        .eq('organization_id', tenantId)
        .order('name', { ascending: true });

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function upsertAccountingCustomerAction(customer: Partial<AccountingCustomer>) {
    const tenantId = await getTenantId();

    if (!customer.name) throw new Error("Müşteri adı zorunludur.");

    const supabase = getSupabaseAdmin();
    const payload = {
        ...customer,
        organization_id: tenantId
    };

    if (!payload.id) {
        delete payload.id;
    }

    const { data, error } = await supabase
        .from('customers')
        .upsert(payload)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/cariler');
    return data;
}

export async function deleteAccountingCustomerAction(id: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('organization_id', tenantId);

    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/cariler');
    return true;
}

export async function getCustomerByIdAction(id: number | string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    // Support both ID types
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).eq('organization_id', tenantId).single();
    if (error) throw new Error(error.message);
    return data;
}

export async function getCustomerMovementsAction(id: string | number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Fetch Invoices
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('contact_id', id)
        .eq('organization_id', tenantId)
        .order('issue_date', { ascending: false });

    // 2. Fetch Payments (Transactions)
    // Query unified transactions
    const { data: payments } = await supabase
        .from('accounting_transactions')
        .select('*, account:accounting_accounts(name)')
        .eq('contact_id', id)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false });

    return {
        invoices: invoices || [],
        payments: payments || []
    };
}

export async function recalculateCustomerBalanceAction(id: string | number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. All Invoices (Debt)
    const { data: invoices } = await supabase.from('invoices').select('total_amount, invoice_type').eq('contact_id', id).eq('organization_id', tenantId);

    // 2. All Transactions (Credits/Payments)
    const { data: transactions } = await supabase.from('accounting_transactions').select('amount, transaction_type').eq('contact_id', id).eq('tenant_id', tenantId);

    let balance = 0;

    // Logic: 
    // Sales Invoice (Satış) -> Costumer owes us (+) -> Balance Increases
    // Return Invoice (İade) -> We owe customer (-) -> Balance Decreases
    invoices?.forEach(inv => {
        const amt = Number(inv.total_amount);
        if (inv.invoice_type === 'SALES') balance += amt;
        if (inv.invoice_type === 'PURCHASE') balance -= amt; // Logic mismatch? Customer usually Sales. Supplier usually Purchase.
        if (inv.invoice_type === 'RETURN_SALES') balance -= amt;
    });

    // Logic:
    // Income (Tahsilat) -> Customer pays us -> Balance Decreases
    // Expense (Ödeme/İade) -> We pay customer -> Balance Increases (or Debt reduces)
    transactions?.forEach(tr => {
        const amt = Number(tr.amount);
        if (tr.transaction_type === 'INCOME') balance -= amt;
        if (tr.transaction_type === 'EXPENSE') balance += amt;
    });

    // Update
    await supabase.from('customers').update({ balance }).eq('id', id).eq('organization_id', tenantId);

    revalidatePath(`/muhasebe/cariler/${id}`);
    revalidatePath('/muhasebe/cariler');
    return balance;
}
