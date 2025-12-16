
import { NextResponse } from 'next/server';
// @ts-ignore
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Inspect Marketplace Accounts to see if we have mixed user_ids
        const { data: accounts, error } = await supabaseAdmin
            .from('marketplace_accounts')
            .select('id, user_id, organization_id, store_name');

        // Group by organization_id to see if one org has multiple user_ids
        const analysis = {};

        if (accounts) {
            accounts.forEach((acc: any) => {
                const org = acc.organization_id || 'NULL';
                // @ts-ignore
                if (!analysis[org]) analysis[org] = { unique_user_ids: new Set(), total_accounts: 0, stores: [] };

                // @ts-ignore
                analysis[org].unique_user_ids.add(acc.user_id);
                // @ts-ignore
                analysis[org].total_accounts++;
                // @ts-ignore
                analysis[org].stores.push(`${acc.store_name} (${acc.user_id})`);
            });
        }

        // Convert Sets to arrays for JSON response
        const formatted = {};
        for (const [key, val] of Object.entries(analysis)) {
            // @ts-ignore
            formatted[key] = {
                // @ts-ignore
                unique_user_count: val.unique_user_ids.size,
                // @ts-ignore
                user_ids: Array.from(val.unique_user_ids),
                // @ts-ignore
                stores: val.stores
            };
        }

        return NextResponse.json({
            success: true,
            analysis: formatted
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
