'use server';

import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// --- HELPERS ---
async function getTenantId() {
    const { orgId, userId } = await auth();
    const tenantId = orgId || userId;
    if (!tenantId) throw new Error("Unauthorized");
    return tenantId;
}

// --- TYPES ---
export type AccountingStats = {
    totalAssets: number;
    totalReceivables: number;
    totalPayables: number;
    monthlySales: number;
    monthlyPurchases: number;
    netProfit: number;
};

// --- READ ACTIONS ---

export async function getAccountingDashboardDataAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const [
        { data: accounts },
        { data: customers },
        { data: suppliers },
        { data: transactions }
    ] = await Promise.all([
        // 1. Assets (Bank/Cash)
        supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId),

        // 2. Receivables (Customers) - Assumes customers table has organization_id
        supabase.from('customers').select('balance').eq('organization_id', tenantId),

        // 3. Payables (Suppliers) - Assumes suppliers table has organization_id
        supabase.from('suppliers').select('balance').eq('organization_id', tenantId),

        // 4. Recent Transactions (Last 6 Months for Chart)
        supabase.from('accounting_transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('date', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())
            .order('date', { ascending: false })
    ]);

    // Calculate Stats
    const totalAssets = accounts?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0;
    const totalReceivables = customers?.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0) || 0;
    const totalPayables = suppliers?.reduce((sum, s) => sum + (Number(s.balance) > 0 ? Number(s.balance) : 0), 0) || 0;

    // Monthly Flow
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let monthlySales = 0;
    let monthlyPurchases = 0;

    // Chart Data
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
            name: d.toLocaleDateString('tr-TR', { month: 'short' }),
            month: d.getMonth(),
            year: d.getFullYear(),
            gelir: 0,
            gider: 0
        };
    });

    if (transactions) {
        transactions.forEach((t: any) => {
            const tDate = new Date(t.date);
            const amt = Number(t.amount);

            // Monthly Total
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if (t.transaction_type === 'INCOME') monthlySales += amt;
                else if (t.transaction_type === 'EXPENSE') monthlyPurchases += amt;
            }

            // Chart
            const monthData = last6Months.find(m => m.month === tDate.getMonth() && m.year === tDate.getFullYear());
            if (monthData) {
                if (t.transaction_type === 'INCOME') monthData.gelir += amt;
                else if (t.transaction_type === 'EXPENSE') monthData.gider += amt;
            }
        });
    }

    return {
        stats: {
            totalAssets,
            totalReceivables,
            totalPayables,
            monthlySales,
            monthlyPurchases,
            netProfit: monthlySales - monthlyPurchases
        },
        accounts: accounts || [],
        recentTransactions: transactions?.slice(0, 5) || [],
        chartData: last6Months
    };
}

export async function getAccountsAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId).order('name');
    return data || [];
}

export async function getTransactionsAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
        .from('accounting_transactions')
        .select(`
            *,
            account:accounting_accounts(name),
            category:accounting_categories(name)
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(100); // Pagination later
    return data || [];
}

// Support for Advanced Filtering (Gelir-Gider Page)
export async function getFilteredTransactionsAction(filters: {
    startDate: string;
    endDate: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 30;
    const from = (page - 1) * pageSize;
    const to = page * pageSize - 1;

    let query = supabase
        .from('accounting_transactions')
        .select(`
            *, 
            account:accounting_accounts(name),
            category:accounting_categories(name)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate + ' 23:59:59')
        .order('date', { ascending: false })
        .range(from, to);

    if (filters.type && filters.type !== "Tümü") {
        const typeMap: Record<string, string> = { 'Gelir': 'INCOME', 'Gider': 'EXPENSE', 'Virman': 'TRANSFER' };
        if (typeMap[filters.type]) query = query.eq('transaction_type', typeMap[filters.type]);
    }

    if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    // Calculate Stats for the filtered range (Separate query, lightweight)
    let statsQuery = supabase
        .from('accounting_transactions')
        .select('amount, transaction_type')
        .eq('tenant_id', tenantId)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate + ' 23:59:59');

    if (filters.type && filters.type !== "Tümü") {
        const typeMap: Record<string, string> = { 'Gelir': 'INCOME', 'Gider': 'EXPENSE', 'Virman': 'TRANSFER' };
        if (typeMap[filters.type]) statsQuery = statsQuery.eq('transaction_type', typeMap[filters.type]);
    }

    const { data: statsData } = await statsQuery;

    let stats = { income: 0, expense: 0, balance: 0 };
    if (statsData) {
        const inc = statsData.filter(t => t.transaction_type === 'INCOME').reduce((a, b) => a + Number(b.amount), 0);
        const exp = statsData.filter(t => t.transaction_type === 'EXPENSE').reduce((a, b) => a + Number(b.amount), 0);
        stats = { income: inc, expense: exp, balance: inc - exp };
    }

    return {
        data: data || [],
        totalCount: count || 0,
        stats
    };
}

export async function getAccountDetailsAction(id: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Account Info
    const { data: account, error: accError } = await supabase
        .from('accounting_accounts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

    if (accError) throw new Error("Hesap bulunamadı.");

    // 2. Transactions
    const { data: transactions } = await supabase
        .from('accounting_transactions')
        .select(`
            *,
            category:accounting_categories(name)
        `)
        .eq('account_id', id)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(100);

    return {
        account,
        transactions: transactions || []
    };
}

export async function getCategoriesAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('accounting_categories').select('*').eq('tenant_id', tenantId);

    // If no categories, maybe return some defaults? Or handle in UI.
    return data || [];
}

// --- WRITE ACTIONS ---

export async function upsertAccountAction(data: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const payload = {
        tenant_id: tenantId,
        name: data.name,
        type: data.type || 'general',
        currency: data.currency || 'TRY',
        bank_name: data.bank_name,
        iban: data.iban,
        updated_at: new Date().toISOString()
    };

    let error;
    if (data.id) {
        ({ error } = await supabase.from('accounting_accounts').update(payload).eq('id', data.id).eq('tenant_id', tenantId));
    } else {
        ({ error } = await supabase.from('accounting_accounts').insert(payload));
    }

    if (error) return { success: false, error: error.message };
    revalidatePath('/muhasebe/finans');
    return { success: true };
}

export async function createTransactionAction(data: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Create Transaction
    const { error: txError } = await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        account_id: data.account_id,
        category_id: data.category_id,
        amount: data.amount,
        currency: data.currency || 'TRY',
        transaction_type: data.transaction_type, // INCOME, EXPENSE, TRANSFER
        date: data.date || new Date().toISOString(),
        description: data.description,
        document_no: data.document_no
    });

    if (txError) return { success: false, error: txError.message };

    // 2. Update Account Balance
    // Simple fetch-modify-save for balance
    const { data: account } = await supabase.from('accounting_accounts').select('balance').eq('id', data.account_id).single();
    if (account) {
        let newBalance = Number(account.balance);
        if (data.transaction_type === 'INCOME') newBalance += Number(data.amount);
        else if (data.transaction_type === 'EXPENSE') newBalance -= Number(data.amount);
        // Transfer logic needs source/target logic. Basic Income/Expense for now.

        await supabase.from('accounting_accounts').update({ balance: newBalance }).eq('id', data.account_id);
    }

    revalidatePath('/muhasebe/finans');
    revalidatePath('/muhasebe');
    return { success: true };
}

export async function deleteTransactionAction(id: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 0. Get Transaction to reverse balance
    const { data: tx } = await supabase.from('accounting_transactions').select('*').eq('id', id).eq('tenant_id', tenantId).single();
    if (!tx) throw new Error("İşlem bulunamadı.");

    // 1. Delete
    const { error } = await supabase.from('accounting_transactions').delete().eq('id', id).eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);

    // 2. Reverse Balance
    // Note: This logic is brittle if concurrent edits happen. But better than nothing.
    const { data: account } = await supabase.from('accounting_accounts').select('balance').eq('id', tx.account_id).single();
    if (account) {
        let newBalance = Number(account.balance);
        // Reverse logic
        if (tx.transaction_type === 'INCOME') newBalance -= Number(tx.amount); // Remove Income -> Decrease Balance
        else if (tx.transaction_type === 'EXPENSE') newBalance += Number(tx.amount); // Remove Expense -> Increase Balance

        await supabase.from('accounting_accounts').update({ balance: newBalance }).eq('id', tx.account_id);
    }

    revalidatePath('/muhasebe/gelir-gider');
    revalidatePath('/muhasebe/finans');
    return true;
}

export async function createCategoryAction(name: string, type: string, color?: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('accounting_categories').insert({
        tenant_id: tenantId,
        name,
        type,
        color
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/muhasebe/finans');
    return { success: true };
}
