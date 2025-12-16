
import { NextResponse } from 'next/server';
// @ts-ignore
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tables = [
            'master_products',
            'orders',
            'marketplace_orders',
            'marketplace_questions',
            'marketplace_accounts'
        ];

        const schemaInfo = {};

        for (const table of tables) {
            // PostgreSQL specific query to get columns
            const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name: table });

            // If RPC fails (likely exists), try raw query if possible (supa-js doesn't allow raw easily without rpc)

            // Fallback: Just try to select a single row to see keys
            const { data: sampleData, error: sampleError } = await supabaseAdmin
                .from(table)
                .select('*')
                .limit(1);

            // @ts-ignore
            schemaInfo[table] = {
                sample_keys: sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : 'No records or failed',
                error: sampleError ? sampleError.message : null
            };
        }

        return NextResponse.json({
            success: true,
            schema_info: schemaInfo
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
