import { getSupabaseAdmin } from "@/lib/supabaseClient";

export type EventSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type EventType = 'LOGIN' | 'PAYMENT' | 'SUBSCRIPTION' | 'SYSTEM' | 'ERROR' | 'SECURITY';

export async function logSystemEvent(
    eventType: EventType,
    message: string,
    severity: EventSeverity = 'INFO',
    metadata: any = {},
    tenantId?: string | null
) {
    try {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('system_audit_logs').insert({
            event_type: eventType,
            message,
            severity,
            metadata,
            tenant_id: tenantId
        });

        if (error) {
            console.error("Logger Failed:", error);
        }
    } catch (e) {
        console.error("Logger Exception:", e);
    }
}
