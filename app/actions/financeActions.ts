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

// --- ADAPTER TYPES ---
// These match what the UI expects, but we map them to new DB structure
export type FinanceSummary = {
    totalBankBalance: number;
    totalSafeBalance: number;
    totalCreditDebt: number;
    totalChequeIn: number;
    totalChequeOut: number;
    recentTransactions: any[];
};

// --- DASHBOARD ACTIONS (ADAPTED) ---

export async function getFinanceDashboardSummaryAction(): Promise<FinanceSummary> {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Fetch Accounts (Bank/Safe)
    const { data: accounts } = await supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId);

    // 2. Fetch Credit Cards (Mapped to 'credit_card' type in accounts ?)
    // actually schema supported it. Let's assume we map them.

    const bankTotal = accounts?.filter(a => a.type === 'bank').reduce((sum, a) => sum + Number(a.balance), 0) || 0;
    const safeTotal = accounts?.filter(a => a.type === 'cash').reduce((sum, a) => sum + Number(a.balance), 0) || 0;
    const cardTotal = accounts?.filter(a => a.type === 'credit_card').reduce((sum, a) => sum + Number(a.balance), 0) || 0;

    // 3. Cheques (Still separate table most likely)
    const { data: chequesIn } = await supabase.from('cheques_notes')
        .select('amount')
        .eq('organization_id', tenantId)
        .eq('type', 'CHEQUE')
        .eq('direction', 'IN')
        .eq('status', 'PORTFOLIO');
    const chInTotal = chequesIn?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // 4. Transactions
    const { data: lastTrans } = await supabase
        .from('accounting_transactions')
        .select(`
            *,
            category:accounting_categories(name)
        `)
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .limit(10);

    return {
        totalBankBalance: bankTotal,
        totalSafeBalance: safeTotal,
        totalCreditDebt: Math.abs(cardTotal), // Display debt as positive
        totalChequeIn: chInTotal,
        totalChequeOut: 0,
        recentTransactions: lastTrans || []
    };
}

export async function getFinancialAccountsAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('accounting_accounts')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getFinanceDropdownsAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const [accounts, categories, customers, suppliers] = await Promise.all([
        supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId),
        supabase.from('accounting_categories').select('*').eq('tenant_id', tenantId),
        supabase.from('customers').select('id, name, balance').eq('organization_id', tenantId),
        supabase.from('suppliers').select('id, name, balance').eq('organization_id', tenantId)
    ]);

    // Map to UI expectations
    return {
        banks: accounts.data?.filter(a => a.type === 'bank').map(a => ({
            id: a.id,
            account_name: a.name, // Mapping
            bank_name: a.bank_name || a.name,
            currency: a.currency,
            current_balance: a.balance
        })) || [],
        safes: accounts.data?.filter(a => a.type === 'cash').map(a => ({
            id: a.id,
            name: a.name, // consistent naming
            currency: a.currency,
            current_balance: a.balance
        })) || [],
        cards: accounts.data?.filter(a => a.type === 'credit_card').map(a => ({
            id: a.id,
            card_name: a.name,
            current_debt: Math.abs(a.balance || 0), // Assuming negative balance
            limit: 0
        })) || [],
        categories: categories.data || [],
        contacts: [
            ...(customers.data?.map(x => ({ ...x, type: 'customer' })) || []),
            ...(suppliers.data?.map(x => ({ ...x, type: 'supplier' })) || [])
        ]
    };
}

// --- CRUD ACTIONS (MAPPED TO NEW TABLES) ---

// BANKS
export async function getBanksAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    // Use new table
    const { data } = await supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId).eq('type', 'bank');
    // Map if needed? Or simply return. UI might expect 'bank_name', 'current_balance'. 
    // Adapting to UI:
    return (data || []).map(d => ({
        ...d,
        bank_name: d.bank_name || d.name,
        current_balance: d.balance
    }));
}

export async function addBankAction(bank: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    await supabase.from('accounting_accounts').insert({
        tenant_id: tenantId,
        type: 'bank',
        name: bank.account_name || bank.name,
        bank_name: bank.bank_name,
        currency: bank.currency || 'TRY',
        iban: bank.iban,
        balance: bank.opening_balance || 0,
        is_active: true
    });

    revalidatePath('/muhasebe/finans/bankalar');
    revalidatePath('/muhasebe/finans');
}

// SAFES
export async function getSafesAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId).eq('type', 'cash');
    return (data || []).map(d => ({
        ...d,
        current_balance: d.balance
    }));
}

export async function addSafeAction(safe: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    await supabase.from('accounting_accounts').insert({
        tenant_id: tenantId,
        type: 'cash',
        name: safe.name,
        currency: safe.currency || 'TRY',
        balance: 0,
        is_active: true
    });
    revalidatePath('/muhasebe/finans/kasalar');
    revalidatePath('/muhasebe/finans');
}

// CARDS (Mapped to type='credit_card')
export async function getCardsAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('accounting_accounts').select('*').eq('tenant_id', tenantId).eq('type', 'credit_card');
    return (data || []).map(d => ({
        ...d,
        card_name: d.name,
        current_debt: Math.abs(d.balance || 0)
    }));
}

export async function addCardAction(card: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    await supabase.from('accounting_accounts').insert({
        tenant_id: tenantId,
        type: 'credit_card',
        name: card.card_name,
        balance: 0, // Starts 0 debt
        is_active: true
    });
    revalidatePath('/muhasebe/finans/kartlar');
    revalidatePath('/muhasebe/finans');
}

// TRANSACTION (MAPPED TO accounting_transactions)
export async function addFinancialTransactionAction(data: {
    transaction_type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    source_type: 'BANK' | 'SAFE' | 'CREDIT_CARD';
    source_id: string; // Account ID
    target_type?: 'BANK' | 'SAFE' | 'CREDIT_CARD';
    target_id?: string;
    category_id: string; // accounting_categories
    contact_id?: number | null;
    amount: number;
    description: string;
    date: string;
    contact_type?: 'customer' | 'supplier';
}) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const amountVal = Number(data.amount);

    // 1. Transaction Record
    const { error: transError } = await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: data.transaction_type,
        // source_type mapping: not explicitly in new schema, implied by account_id type? 
        // New schema has single account_id. 
        // For TRANSFER: we might need two transactions or one linked? 
        // Logic:
        // INCOME/EXPENSE: account_id = source_id.
        // TRANSFER: We create TWO transactions? Out from source, In to target.

        account_id: Number(data.source_id),
        category_id: Number(data.category_id),
        contact_id: data.contact_id ? Number(data.contact_id) : null,
        amount: amountVal,
        description: data.description,
        date: data.date
    });

    if (transError) throw new Error(transError.message);

    // 2. Update Balances
    // Handle Source
    const { data: sourceAcc } = await supabase.from('accounting_accounts').select('balance').eq('id', data.source_id).single();
    if (sourceAcc) {
        let newBalance = Number(sourceAcc.balance);
        if (data.transaction_type === 'INCOME') newBalance += amountVal;
        else newBalance -= amountVal; // EXPENSE or TRANSFER (Out)

        await supabase.from('accounting_accounts').update({ balance: newBalance }).eq('id', data.source_id);
    }

    // Handle Target (Transfer)
    if (data.transaction_type === 'TRANSFER' && data.target_id) {
        // Create 2nd transaction for Inflow?
        await supabase.from('accounting_transactions').insert({
            tenant_id: tenantId,
            transaction_type: 'INCOME', // It's income for the target
            account_id: Number(data.target_id),
            category_id: Number(data.category_id), // Same category
            amount: amountVal,
            description: `Transfer: ${data.description}`,
            date: data.date
        });

        const { data: targetAcc } = await supabase.from('accounting_accounts').select('balance').eq('id', data.target_id).single();
        if (targetAcc) {
            await supabase.from('accounting_accounts').update({ balance: Number(targetAcc.balance) + amountVal }).eq('id', data.target_id);
        }
    }

    // Handle Contacts
    if (data.contact_id && data.contact_type) {
        const table = data.contact_type === 'customer' ? 'customers' : 'suppliers';
        const { data: contact } = await supabase.from(table).select('balance').eq('id', data.contact_id).single();
        if (contact) {
            let newBalance = Number(contact.balance || 0);
            if (data.transaction_type === 'INCOME') newBalance -= amountVal; // Customer paid us -> Debt reduces
            if (data.transaction_type === 'EXPENSE') newBalance += amountVal; // We paid supplier -> Debt reduces (Assuming logic?) 
            // Standard accounting: 
            // Customer Balance (Positive = They owe us). Income = They pay = Balance decreases. Correct.
            // Supplier Balance (Positive = We owe them ?? or Negative?). 
            // In App: Suppliers Page showed "Green if +". Text said "Alacaklıyız". 
            // Usually Supplier + means We paid in advance. - means We owe.
            // If We Pay (Expense) -> We give money -> Balance increases (relieves debt or goes positive). Correct.

            await supabase.from(table).update({ balance: newBalance }).eq('id', data.contact_id);
        }
    }

    revalidatePath('/muhasebe/finans');
    revalidatePath('/muhasebe/fatura');
    return true;
}


// --- POS, CHEQUE, LOANS (LEGACY TABLES WRAPPER W/ TENANT ID) ---

export async function getPOSDevicesAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    // Assuming pos_devices still exists and has organization_id
    const { data, error } = await supabase.from('pos_devices').select('*, banks(bank_name)').eq('organization_id', tenantId).order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

export async function addPOSDeviceAction(pos: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('pos_devices').insert({
        ...pos,
        organization_id: tenantId,
        current_balance: 0
    });
    if (error) throw new Error(error.message);
    revalidatePath('/muhasebe/finans/pos');
}

export async function addPOSSaleAction(posId: string, amount: number, description: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // POS Balance
    const { data: pos } = await supabase.from('pos_devices').select('current_balance').eq('id', posId).single();
    if (pos) {
        await supabase.from('pos_devices').update({ current_balance: (pos.current_balance || 0) + amount }).eq('id', posId);
    }
    revalidatePath('/muhasebe/finans/pos');
}


export async function settlePOSAction(posId: string, amount: number, bankId: string, commissionRate: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const settlementAmount = Number(amount);
    const commissionAmount = (settlementAmount * commissionRate) / 100;
    const netAmount = settlementAmount - commissionAmount;

    // 1. Bank Income (Net) -> accounting_transactions
    await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: 'INCOME',
        // source_type: 'BANK',
        account_id: Number(bankId), // Assuming bankId is now accounting_account.id
        amount: netAmount,
        description: `POS Gün Sonu - Brüt: ${settlementAmount}, Kom: ${commissionAmount}`,
        date: new Date().toISOString()
    });

    // 2. Update Bank Balance (accounting_accounts)
    const { data: bank } = await supabase.from('accounting_accounts').select('balance').eq('id', bankId).single();
    if (bank) {
        await supabase.from('accounting_accounts').update({ balance: Number(bank.balance) + netAmount }).eq('id', bankId);
    }

    // 3. Decrease POS Balance
    const { data: pos } = await supabase.from('pos_devices').select('current_balance').eq('id', posId).single();
    if (pos) {
        await supabase.from('pos_devices').update({ current_balance: (pos.current_balance || 0) - settlementAmount }).eq('id', posId);
    }
    revalidatePath('/muhasebe/finans/pos');
    revalidatePath('/muhasebe/finans');
}

// Cheques
export async function getChequesNotesAction(type: 'CHEQUE' | 'PROMISSORY_NOTE', direction: 'IN' | 'OUT') {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('cheques_notes')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('type', type)
        .eq('direction', direction)
        .order('due_date', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function addChequeNoteAction(item: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('cheques_notes').insert({
        ...item,
        organization_id: tenantId,
        status: 'PORTFOLIO'
    });
    if (error) throw new Error(error.message);
    revalidatePath('/muhasebe/finans/cek-senet');
}

// Loans
export async function getLoansAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // If loans.bank_id referenced 'banks', and I populated 'accounting_accounts', the ID might not exist or be different.
    // For now, remove join or assume legacy. 

    const { data, error } = await supabase.from('loans').select('*').eq('organization_id', tenantId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getLoanInstallmentsAction(loanId: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('loan_installments').select('*').eq('loan_id', loanId).order('installment_no', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function addLoanAction(loanData: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const principal = Number(loanData.principal_amount);
    const rate = Number(loanData.interest_rate) / 100;
    const months = Number(loanData.installment_count);
    const startDate = new Date(loanData.start_date);

    // Calc Payment Plan
    let monthlyPayment = 0;
    if (rate > 0) {
        monthlyPayment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    } else {
        monthlyPayment = principal / months;
    }
    const totalAmount = monthlyPayment * months;
    const totalInterest = totalAmount - principal;

    // Generate Installments
    const plan = [];
    let remainingPrincipal = principal;
    for (let i = 1; i <= months; i++) {
        const interestPart = remainingPrincipal * rate;
        const principalPart = monthlyPayment - interestPart;
        remainingPrincipal -= principalPart;

        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        plan.push({
            installment_no: i,
            due_date: dueDate.toISOString().split('T')[0],
            amount: monthlyPayment,
            principal_part: principalPart,
            interest_part: interestPart,
            remaining_balance: Math.max(0, remainingPrincipal),
            status: 'PENDING',
            organization_id: tenantId
        });
    }

    // Insert Loan
    const { data: loan, error: loanError } = await supabase.from('loans').insert({
        organization_id: tenantId,
        bank_id: loanData.bank_id, // This should be accounting_account ID
        loan_type: loanData.loan_type,
        principal_amount: principal,
        interest_rate: Number(loanData.interest_rate),
        installment_count: months,
        start_date: loanData.start_date,
        total_interest: totalInterest,
        total_amount: totalAmount,
        status: 'ACTIVE'
    }).select().single();

    if (loanError) throw new Error(loanError.message);

    // Insert Installments
    const installmentsData = plan.map(p => ({ loan_id: loan.id, ...p }));
    const { error: instError } = await supabase.from('loan_installments').insert(installmentsData);
    if (instError) throw new Error(instError.message);

    // Update Bank Balance (Income)
    const { data: bank } = await supabase.from('accounting_accounts').select('balance').eq('id', loanData.bank_id).single();
    if (bank) {
        await supabase.from('accounting_accounts').update({ balance: Number(bank.balance) + principal }).eq('id', loanData.bank_id);
    }

    // Transaction Record
    await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: 'INCOME',
        // source_type: 'BANK',
        account_id: loanData.bank_id,
        amount: principal,
        description: `Kredi Kullanımı: ${loanData.loan_type} (#${loan.id})`,
        date: loanData.start_date
    });

    revalidatePath('/muhasebe/finans/krediler');
    revalidatePath('/muhasebe/finans');
}

export async function payLoanInstallmentAction(installmentId: string, loanId: string, amount: number, description: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Mark as Paid
    const { error } = await supabase.from('loan_installments').update({
        status: 'PAID',
        paid_date: new Date().toISOString().split('T')[0]
    }).eq('id', installmentId).eq('organization_id', tenantId);

    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/finans/krediler');
}

// --- REPORT ACTIONS ---

export async function getFinanceReportDataAction(dateRange: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Date Filter
    let startDate = new Date();
    if (dateRange !== "ALL") {
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
    } else {
        startDate = new Date("2000-01-01");
    }

    // 2. Fetch Data in Parallel
    const [transactionsRes, banksRes, safesRes, loansRes] = await Promise.all([
        supabase
            .from("accounting_transactions") // mapped
            .select(`
                id, amount, transaction_type, date, description,
                category:accounting_categories(name)
            `)
            .eq('tenant_id', tenantId)
            .gte("date", startDate.toISOString())
            .order("date", { ascending: true }),

        supabase.from("accounting_accounts").select("bank_name, name, balance, currency").eq('tenant_id', tenantId).eq('type', 'bank'),
        supabase.from("accounting_accounts").select("name, balance, currency").eq('tenant_id', tenantId).eq('type', 'cash'),
        supabase.from("loan_installments").select("amount").eq('organization_id', tenantId).neq("status", "PAID")
    ]);

    if (transactionsRes.error) throw new Error(transactionsRes.error.message);
    if (banksRes.error) throw new Error(banksRes.error.message);
    if (safesRes.error) throw new Error(safesRes.error.message);
    if (loansRes.error) throw new Error(loansRes.error.message);

    return {
        transactions: transactionsRes.data || [],
        banks: banksRes.data || [],
        safes: safesRes.data || [],
        loanInstallments: loansRes.data || []
    };
}
