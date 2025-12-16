import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = getSupabaseAdmin();
    const tables = [
        'marketplace_connections',
        'marketplace_accounts',
        'master_products',
        'orders',
        'marketplace_orders',
        'cargo_connections',
        'marketplace_questions', // Added based on earlier edits
        'marketplace_reviews'    // Assumed
    ];

    const results = {};

    try {
        for (const table of tables) {
            // 1. Find records where organization_id IS NULL and user_id IS NOT NULL
            const { data: records, error: fetchError } = await supabase
                .from(table)
                .select('id, user_id')
                .is('organization_id', null)
                .not('user_id', 'is', null)
                .limit(1000); // Process in chunks to avoid timeouts

            if (fetchError) {
                // @ts-ignore
                results[table] = { status: 'error', error: fetchError.message };
                continue;
            }

            if (!records || records.length === 0) {
                // @ts-ignore
                results[table] = { status: 'skipped', message: 'No records to migrate' };
                continue;
            }

            let updatedCount = 0;
            let errors = [];

            // 2. Update each record
            for (const record of records) {
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ organization_id: record.user_id })
                    .eq('id', record.id);

                if (updateError) {
                    errors.push({ id: record.id, error: updateError.message });
                } else {
                    updatedCount++;
                }
            }

            // @ts-ignore
            results[table] = {
                status: 'processed',
                found: records.length,
                updated: updatedCount,
                failed: errors.length > 0 ? errors : 0
            };
        }

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
