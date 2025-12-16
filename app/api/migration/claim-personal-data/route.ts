
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId, orgId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!orgId) {
            return NextResponse.json({
                message: "You are currently in Personal Mode. Please switch to an Organization.",
                your_user_id: userId
            });
        }

        const supabase = getSupabaseAdmin();
        const results = {};

        // 1. Master Products
        // Already moved or no records (based on prev logs), but safe to run again
        const { error: prodError, count: prodCount } = await supabase
            .from('master_products')
            .update({ organization_id: orgId })
            .eq('organization_id', userId); // Moves from Personal -> Org

        // @ts-ignore
        results['master_products'] = prodError ? prodError.message : `Updated records`;

        // 2. Orders
        // PROBLEM: user_id is UUID, so we cannot filter by .eq('user_id', userId) if userId is string.
        // SOLUTION: reliable identifier is now organization_id (which might be the old UUID or null).
        // STRATEGY: Claim ALL orders that correspond to the "Old UUID" found in organization_id?
        // OR: Simpler: Claim ALL orders that are NOT in the current org yet? (Aggressive but effective for single-tenant-like recovery)

        // Let's filter by: organization_id IS NOT NULL AND organization_id != orgId
        // And assumes the user owns them. 
        // Safer: We assume the previous migration copied data to organization_id.
        // Since we can't query user_id (UUID mismatch), we will blindly update based on not being the current org.

        const { error: orderMoveError } = await supabase
            .from('orders')
            .update({ organization_id: orgId })
            .neq('organization_id', orgId)
            // Safety: Only if organization_id looks like a UUID (length check? or just not starting with 'org_')
            // This prevents stealing other valid org data if multiple exist.
            .not('organization_id', 'ilike', 'org_%');

        // @ts-ignore
        results['orders'] = orderMoveError ? orderMoveError.message : `Updated orders (Blind Claim)`;

        // 3. Marketplace Accounts
        // Same UUID issue.
        const { error: accMoveError } = await supabase
            .from('marketplace_accounts')
            .update({ organization_id: orgId })
            .neq('organization_id', orgId)
            .not('organization_id', 'ilike', 'org_%');

        // @ts-ignore
        results['marketplace_accounts'] = accMoveError ? accMoveError.message : `Updated accounts (Blind Claim)`;

        // 4. Questions
        const { error: qError } = await supabase
            .from('marketplace_questions')
            .update({ organization_id: orgId })
            .eq('organization_id', userId);

        // @ts-ignore
        results['marketplace_questions'] = qError ? qError.message : `Updated questions`;


        return NextResponse.json({
            success: true,
            migrated_to_org: orgId,
            details: results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
