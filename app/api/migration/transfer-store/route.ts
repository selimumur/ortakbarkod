
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const storeName = searchParams.get('storeName');
        const targetOrgId = searchParams.get('targetOrgId');

        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: "Unauthorized. Please log in to the SOURCE Organization." }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // 0. Pre-check: What stores DOES this org have?
        const { data: existingStores } = await supabase
            .from('marketplace_accounts')
            .select('store_name')
            .eq('organization_id', orgId);

        const storeList = existingStores?.map(s => s.store_name) || [];

        if (!storeName || !targetOrgId) {
            return NextResponse.json({
                error: "Missing parameters.",
                current_org_stores: storeList, // DATA VISIBILITY
                usage: "?storeName=PARTIAL_NAME&targetOrgId=org_XYZ"
            }, { status: 400 });
        }

        const results = {};

        // 1. Find the Account(s)
        const { data: accounts, error: findError } = await supabase
            .from('marketplace_accounts')
            .select('id, store_name, organization_id')
            .eq('organization_id', orgId)
            .ilike('store_name', `%${storeName}%`);

        if (findError || !accounts || accounts.length === 0) {
            return NextResponse.json({
                error: "Store not found in current organization.",
                searched_for: storeName,
                available_stores_in_current_org: storeList, // HELP USER DEBUG
                findError
            });
        }

        const accountIds = accounts.map(a => a.id);
        const accountNames = accounts.map(a => a.store_name);

        // 2. Update Accounts
        const { error: accUpdateError } = await supabase
            .from('marketplace_accounts')
            .update({ organization_id: targetOrgId })
            .in('id', accountIds);

        // @ts-ignore
        results['accounts'] = accUpdateError ? accUpdateError.message : `Transferred ${accountNames.join(', ')}`;

        // 3. Update Orders linked to these accounts
        const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({ organization_id: targetOrgId })
            .in('store_id', accountIds);

        // @ts-ignore
        results['orders'] = orderUpdateError ? orderUpdateError.message : `Transferred orders linked to stores`;

        // 4. Update Questions
        const { error: qUpdateError } = await supabase
            .from('marketplace_questions')
            .update({ organization_id: targetOrgId })
            .in('store_id', accountIds);

        // @ts-ignore   
        results['questions'] = qUpdateError ? qUpdateError.message : `Transferred questions`;

        // 5. Update Marketplace Orders
        const { error: moUpdateError } = await supabase
            .from('marketplace_orders')
            .update({ organization_id: targetOrgId })
            .in('store_id', accountIds);

        // @ts-ignore   
        results['marketplace_orders'] = moUpdateError ? moUpdateError.message : `Transferred marketplace_orders`;

        // 6. Update Products (CRITICAL)
        // Link table is 'product_marketplaces'

        // a) Find product IDs linked to these stores
        const { data: links, error: linkError } = await supabase
            .from('product_marketplaces')
            .select('product_id')
            .in('marketplace_id', accountIds);

        if (links && links.length > 0) {
            const productIds = links.map(l => l.product_id); // These are master_product IDs

            // b) Update link table organization_id
            const { error: linkUpdateError } = await supabase
                .from('product_marketplaces')
                .update({ organization_id: targetOrgId })
                .in('marketplace_id', accountIds);

            // c) Update Master Products
            const { error: masterUpdateError, count: masterCount } = await supabase
                .from('master_products')
                .update({ organization_id: targetOrgId })
                .in('id', productIds);

            // @ts-ignore   
            results['products'] = `Transferred ${links.length} links and linked master products.`;
        } else {
            // @ts-ignore   
            results['products'] = "No product links found to transfer.";
        }

        return NextResponse.json({
            success: true,
            source_org: orgId,
            target_org: targetOrgId,
            transferred_stores: accountNames,
            details: results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
