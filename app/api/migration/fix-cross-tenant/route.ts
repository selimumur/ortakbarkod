
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
// @ts-ignore
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized. Please log in to your Organization." }, { status: 401 });
        }

        // We can't compare Clerk ID (string) with DB user_id (UUID).
        // So we will just list ALL user_ids found in this Org, and how many records they have.

        // 1. Analyze Orders
        // We use RPC or raw query if possible, but simple Group By is hard with JS client without helper.
        // We'll fetch all IDs and group in memory (assuming < 10k records, usually okay for this scale).

        const { data: orders, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('user_id')
            .eq('organization_id', orgId);

        const orderCounts = {};
        if (orders) {
            orders.forEach((o: any) => {
                const uid = o.user_id || 'NULL';
                // @ts-ignore
                orderCounts[uid] = (orderCounts[uid] || 0) + 1;
            });
        }

        // 2. Analyze Accounts
        const { data: accounts, error: accError } = await supabaseAdmin
            .from('marketplace_accounts')
            .select('user_id, store_name')
            .eq('organization_id', orgId);

        const accountCounts = {};
        if (accounts) {
            accounts.forEach((acc: any) => {
                const uid = acc.user_id || 'NULL';
                // @ts-ignore
                if (!accountCounts[uid]) accountCounts[uid] = [];
                // @ts-ignore
                accountCounts[uid].push(acc.store_name);
            });
        }

        return NextResponse.json({
            success: true,
            message: "Below are the original User IDs (UUIDs) found in your Organization.",
            analysis: {
                current_org_id: orgId,
                found_user_uuids: Object.keys(orderCounts),
                details: {
                    orders_by_user_uuid: orderCounts,
                    accounts_by_user_uuid: accountCounts
                }
            },
            instruction: "Identify which UUID is NOT you (likely the one with fewer records or unrecognized stores)."
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
