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

export type Personnel = {
    id: number;
    organization_id: string;
    name: string;
    role: string;
    department: string;
    is_active: boolean;
    net_salary?: number;
    daily_food_fee?: number;
    daily_road_fee?: number;
    overtime_rate?: number;
};

// ... existing actions ...

export async function getPersonnelAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .eq('organization_id', tenantId)
        .order('name');
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getPersonnelByIdAction(id: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from('personnel')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function upsertPersonnelAction(personnel: Partial<Personnel>) {
    const tenantId = await getTenantId();
    if (!personnel.name) throw new Error("İsim zorunludur.");
    const supabase = getSupabaseAdmin();
    const payload = { ...personnel, organization_id: tenantId };
    if ((payload as any).id === 'yeni' || !payload.id) delete payload.id;
    const { data, error } = await supabase.from('personnel').upsert(payload).select().single();
    if (error) throw new Error(error.message);
    revalidatePath('/muhasebe/personel');
    return data;
}

// --- PAYROLL ACTIONS ---

export async function getPersonnelPayrollsAction(month: number, year: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // We already fetch via join in logic below, can keep this for compatibility if needed
    // But let's upgrade it to be the main data fetcher for Reports AND Calculation Page if possible.
    // Actually, let's keep this one simple for Reports page, and make `getPayrollCalculationDataAction` for the Calculator page.

    const { data, error } = await supabase
        .from('personnel_payroll')
        .select('*, personnel!inner(name, role, department, organization_id)')
        .eq('period_month', month)
        .eq('period_year', year)
        .eq('personnel.organization_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getPayrollCalculationDataAction(month: number, year: number) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Get All Active Personnel
    const { data: personnel } = await supabase
        .from('personnel')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('is_active', true)
        .order('name');

    // 2. Get Exsiting Payroll Records
    const { data: records } = await supabase
        .from('personnel_payroll')
        .select('*, personnel!inner(organization_id)') // Join to ensure filtering
        .eq('period_month', month)
        .eq('period_year', year)
        .eq('personnel.organization_id', tenantId);

    // 3. Get Advances for Period (Approved/Paid ones)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: advances } = await supabase
        .from('personnel_advances')
        .select('personnel_id, amount, personnel!inner(organization_id)')
        .eq('status', 'Ödendi')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .eq('personnel.organization_id', tenantId);

    // Aggregate Advances
    const advancesByPersonnel: Record<number, number> = {};
    if (advances) {
        advances.forEach((adv: any) => {
            advancesByPersonnel[adv.personnel_id] = (advancesByPersonnel[adv.personnel_id] || 0) + Number(adv.amount);
        });
    }

    // Merge Logic (similar to client side)
    let mergedData: any[] = [];
    if (personnel) {
        mergedData = personnel.map(p => {
            const existing = records?.find((r: any) => r.personnel_id === p.id);
            const totalAdvance = advancesByPersonnel[p.id] || 0;

            if (existing) {
                return {
                    ...existing,
                    _isNew: false,
                    name: p.name,
                    role: p.role,
                    net_salary: p.net_salary,
                    daily_food: p.daily_food_fee,
                    daily_road: p.daily_road_fee,
                    overtime_rate: p.overtime_rate || 1.5,
                    advance_deduction: existing.advance_deduction > 0 ? existing.advance_deduction : totalAdvance
                };
            }

            return {
                personnel_id: p.id,
                name: p.name,
                role: p.role,
                period_month: month,
                period_year: year,
                base_salary: p.net_salary || 0,
                worked_days: 26,
                overtime_hours_weekday: 0,
                overtime_hours_weekend: 0,
                total_overtime_pay: 0,
                total_food_pay: (p.daily_food_fee || 0) * 26,
                total_road_pay: (p.daily_road_fee || 0) * 26,
                advance_deduction: totalAdvance,
                bonuses: 0,
                deductions: 0,
                net_payable: 0,
                status: 'Taslak',
                _isNew: true,
                net_salary: p.net_salary,
                daily_food: p.daily_food_fee,
                daily_road: p.daily_road_fee,
                overtime_rate: p.overtime_rate || 1.5
            };
        });
    }

    return mergedData;
}

export async function savePayrollRowAction(row: any) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // Validate that the personnel belongs to tenant
    const { data: pCheck } = await supabase.from('personnel').select('organization_id').eq('id', row.personnel_id).single();
    if (!pCheck || pCheck.organization_id !== tenantId) throw new Error("Yetkisiz işlem: Personel bulunamadı.");

    const { _isNew, name, role, net_salary, daily_food, daily_road, overtime_rate, ...dbRow } = row;

    if (_isNew) {
        const { error } = await supabase.from('personnel_payroll').insert([dbRow]);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase.from('personnel_payroll').update(dbRow).eq('id', row.id);
        if (error) throw new Error(error.message);
    }

    revalidatePath('/muhasebe/personel/maas-mesai');
    revalidatePath('/muhasebe/personel/raporlar');
    return { success: true };
}

export async function processPayrollPaymentAction(data: {
    payrollId: number;
    sourceAccountId: number;
    categoryId: number;
    amount: number;
    description: string;
    paymentDay: string;
}) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // 1. Transaction (Expense)
    const { error: transError } = await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: 'EXPENSE',
        account_id: data.sourceAccountId,
        category_id: data.categoryId,
        amount: data.amount,
        description: data.description,
        date: data.paymentDay
    });
    if (transError) throw new Error("Transaction hatası: " + transError.message);

    // 2. Update Account Balance
    const { data: acc } = await supabase.from('accounting_accounts').select('balance').eq('id', data.sourceAccountId).single();
    if (acc) {
        await supabase.from('accounting_accounts').update({ balance: Number(acc.balance) - data.amount }).eq('id', data.sourceAccountId);
    }

    // 3. Update Payroll Status
    const { error: payError } = await supabase.from('personnel_payroll').update({ status: 'Ödendi' }).eq('id', data.payrollId);
    if (payError) throw new Error("Bordro güncelleme hatası: " + payError.message);

    revalidatePath('/muhasebe/personel/raporlar');
    return true;
}

// --- ADVANCES ACTIONS ---

export async function getAdvancesAction() {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
        .from('personnel_advances')
        .select('*, personnel!inner(name, role, organization_id)')
        .eq('personnel.organization_id', tenantId)
        .order('request_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function createAdvanceAction(data: {
    personnelId: number;
    amount: number;
    description: string;
    sourceType: 'SAFE' | 'BANK';
    sourceId: number;
    categoryId: number;
}) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    // 1. Insert Advance
    const { error: advError } = await supabase.from('personnel_advances').insert([{
        personnel_id: data.personnelId,
        amount: data.amount,
        description: data.description || 'Avans',
        request_date: today,
        status: 'Ödendi',
        payment_date: today
    }]);
    if (advError) throw new Error(advError.message);

    // 2. Insert Accounting Transaction (Expense)
    const { error: transError } = await supabase.from('accounting_transactions').insert({
        tenant_id: tenantId,
        transaction_type: 'EXPENSE',
        account_id: data.sourceId,
        category_id: data.categoryId,
        amount: data.amount,
        description: `Avans Ödemesi - ${data.description}`,
        date: today
    });
    if (transError) throw new Error(transError.message);

    // 3. Update Balance
    const { data: acc } = await supabase.from('accounting_accounts').select('balance').eq('id', data.sourceId).single();
    if (acc) {
        await supabase.from('accounting_accounts').update({ balance: Number(acc.balance) - data.amount }).eq('id', data.sourceId);
    }

    revalidatePath('/muhasebe/personel/avans');
    return { success: true };
}

export async function updateAdvanceStatusAction(id: number, status: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    // Verify ownership
    const { data: adv } = await supabase.from('personnel_advances')
        .select('*, personnel!inner(organization_id)')
        .eq('id', id)
        .eq('personnel.organization_id', tenantId) // Join check
        .single();

    if (!adv) throw new Error("Kayıt bulunamadı veya yetkisiz.");

    const { error } = await supabase.from('personnel_advances').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/muhasebe/personel/avans');
    return { success: true };
}

export async function getPersonnelAdvancesAction(personnelId: string) {
    const tenantId = await getTenantId();
    const supabase = getSupabaseAdmin();

    const { data: safeData, error: safeError } = await supabase
        .from('personnel_advances')
        .select('*, personnel!inner(organization_id)')
        .eq('personnel_id', personnelId)
        .eq('personnel.organization_id', tenantId)
        .order('request_date', { ascending: false });

    if (safeError) throw new Error(safeError.message);
    return safeData || [];
}
