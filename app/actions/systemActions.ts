"use server";

import { adminAuth } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function getSystemHealthAction() {
    await adminAuth();
    const supabase = getSupabaseAdmin();

    // 1. Audit Logs (Recent 50)
    const { data: logs } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    // 2. Stats
    // Tenant Count
    const { count: tenantCount } = await supabase.from('saas_subscriptions').select('*', { count: 'exact', head: true });

    // Revenue Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: payments } = await supabase
        .from('saas_payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', today.toISOString());
    const revenueToday = payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

    // Error Rate (Last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { count: errorCount } = await supabase
        .from('system_audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'ERROR')
        .gte('created_at', yesterday.toISOString());

    return {
        logs: logs || [],
        stats: {
            tenantCount: tenantCount || 0,
            revenueToday,
            errorCount: errorCount || 0,
            status: 'OPERATIONAL' // Mock status logic
        }
    };
}
