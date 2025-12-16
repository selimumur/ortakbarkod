
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrganizationId } from '@/lib/accessControl';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId, orgId } = await auth();
        const resolvedOrgId = await getOrganizationId();
        const supabase = getSupabaseAdmin();

        // Check record counts for this context
        const { count: productCount } = await supabase
            .from('master_products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', resolvedOrgId);

        const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', resolvedOrgId);

        // Also check if records exist with the User ID (Migration Check)
        const { count: productsWithUserId } = await supabase
            .from('master_products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', userId);

        return NextResponse.json({
            auth: {
                userId,
                orgId,
                resolvedOrgId
            },
            db_checks: {
                products_found_for_resolved_id: productCount,
                orders_found_for_resolved_id: orderCount,
                products_found_fallback_user_id: productsWithUserId
            },
            message: "If 'products_found' is 0, it means no data matches the current 'resolvedOrgId'."
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
