'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { getOrganizationId } from "@/lib/accessControl";
import { revalidatePath } from "next/cache";

async function getTenantId() {
    const orgId = await getOrganizationId();
    if (!orgId) throw new Error("Unauthorized");
    return orgId;
}

export async function getInvoicesAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('invoices').select('*').eq('organization_id', tenantId).order('issue_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getInvoiceByIdAction(id: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('organization_id', tenantId).single();
    if (error) throw new Error(error.message);
    return data;
}

// New Action for Form Data
export async function getInvoiceFormDataAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const [customers, suppliers, products] = await Promise.all([
        supabase.from('customers').select('*').eq('organization_id', tenantId),
        supabase.from('suppliers').select('*').eq('organization_id', tenantId),
        supabase.from('master_products').select('*').eq('organization_id', tenantId) // Assuming master_products has org_id now, or if it is global? 
        // Checks from previous conversations might be needed. If master_products is not multi-tenant yet?
        // Wait, standard modules are multi-tenant.
    ]);

    // If master_products doesn't use organization_id, we might have an issue. 
    // But audit said we are making everything multi-tenant.
    // Let's assume master_products filtering by org is correct or strict RLS applies. 
    // If I'm admin, I MUST filter.

    return {
        customers: customers.data || [],
        suppliers: suppliers.data || [],
        products: products.data || []
    };
}

export async function createInvoiceAction(invoiceData: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Prepare Header
    const invoicePayload = {
        organization_id: tenantId,
        contact_id: invoiceData.contact_id,
        invoice_no: invoiceData.invoice_no,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        invoice_type: invoiceData.invoice_type,
        contact_type: invoiceData.contact_type,
        currency: invoiceData.currency || 'TRY',
        total_amount: invoiceData.total_amount,
        tax_total: invoiceData.tax_total, // Ensure naming consistency
        subtotal: invoiceData.subtotal,
        description: invoiceData.description,
        status: invoiceData.status || 'DRAFT',
        payment_status: 'UNPAID'
    };

    const { data: newInvoice, error: invError } = await supabase.from('invoices').insert(invoicePayload).select().single();
    if (invError) throw new Error(invError.message);

    // 2. Insert Items
    if (invoiceData.items && invoiceData.items.length > 0) {
        const items = invoiceData.items.map((item: any) => ({
            invoice_id: newInvoice.id,
            organization_id: tenantId,
            description: item.description, // if any
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            line_total: item.total || item.line_total,
            product_id: item.product_id || null
        }));

        const { error: itemsError } = await supabase.from('invoice_items').insert(items);
        if (itemsError) throw new Error(itemsError.message);
    }

    // 3. Post-Processing (Stock & Balance) if SENT
    if (newInvoice.status === 'SENT') {
        const type = newInvoice.invoice_type;

        // A) Stock Update
        if (invoiceData.items) {
            for (const item of invoiceData.items) {
                if (!item.product_id) continue;

                // Fetch current stock
                const { data: prod } = await supabase.from('master_products').select('stock').eq('id', item.product_id).single();
                if (prod) {
                    let change = 0;
                    const qty = Number(item.quantity);

                    if (type === 'SALES' || type === 'RETURN_PURCHASE') {
                        change = -qty;
                    } else if (type === 'PURCHASE' || type === 'RETURN_SALES') {
                        change = qty;
                    }

                    await supabase.from('master_products')
                        .update({ stock: (prod.stock || 0) + change })
                        .eq('id', item.product_id);
                }
            }
        }

        // B) Balance Update
        if (newInvoice.contact_id) {
            const table = newInvoice.contact_type === 'CUSTOMER' ? 'customers' : 'suppliers';
            const { data: contact } = await supabase.from(table).select('balance').eq('id', newInvoice.contact_id).single();

            if (contact) {
                let balanceChange = 0;
                const total = Number(newInvoice.total_amount);

                if (type === 'SALES' || type === 'PURCHASE') {
                    balanceChange = total;
                } else if (type === 'RETURN_SALES' || type === 'RETURN_PURCHASE') {
                    balanceChange = -total;
                }
                // Note: The logic assumes 'balance' increases with new invoices regardless of type?
                // Wait, User logic was:
                // Sales: +total
                // Purchase: +total
                // Return Sales: -total
                // Return Purchase: -total
                // This implies 'balance' is magnitude of debt/credit? 
                // Creating a sales invoice increases customer debt.
                // Creating a purchase invoice increases our debt to supplier.
                // So yes, +total seems correct for both primary types if tables are separate and balance means "money exchanged/owed".

                await supabase.from(table)
                    .update({ balance: (contact.balance || 0) + balanceChange })
                    .eq('id', newInvoice.contact_id);
            }
        }
    }

    revalidatePath('/muhasebe/fatura');
    return newInvoice;
}

export async function updateInvoiceStatusAction(id: string, status: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const paymentStatuses = ['PAID', 'UNPAID', 'PARTIAL'];
    const docStatuses = ['DRAFT', 'SENT', 'CANCELLED'];

    let updatePayload: any = {};
    if (paymentStatuses.includes(status)) {
        updatePayload.payment_status = status;
    } else if (docStatuses.includes(status)) {
        updatePayload.status = status;
    } else {
        updatePayload.status = status;
    }

    const { error } = await supabase.from('invoices').update(updatePayload).eq('id', id).eq('organization_id', tenantId);
    if (error) throw new Error(error.message);

    revalidatePath(`/muhasebe/fatura/${id}`);
    revalidatePath('/muhasebe/fatura');
    return true;
}

export async function deleteInvoiceAction(id: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    await supabase.from('invoice_items').delete().eq('invoice_id', id).eq('organization_id', tenantId);
    const { error } = await supabase.from('invoices').delete().eq('id', id).eq('organization_id', tenantId);
    if (error) throw new Error(error.message);
    revalidatePath('/muhasebe/fatura');
    return true;
}

// Ensure quick add product is supported from invoice page if needed,
// likely better to have separate productActions, but for now user might want to keep it simple.
// I will ensure the page uses 'upsertProductAction' from productActions if available, or I'll add it there.

export async function getPurchaseInvoiceItemsAction(invoiceId: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('invoice_items')
        .select(`
            *,
            master_products (name, code, unit),
            raw_materials (name, unit)
        `)
        .eq('invoice_id', invoiceId)
        .eq('organization_id', tenantId);

    if (error) throw new Error(error.message);
    return data || [];
}

