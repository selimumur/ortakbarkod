import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { auth } from '@clerk/nextjs/server';
import { getOrganizationId } from "@/lib/accessControl";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const orgId = await getOrganizationId();

    if (!orgId) {
        return NextResponse.json({ success: false, error: "Organizasyon Bulunamadı" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const matchStatus = searchParams.get('match_status') || 'all'; // all, matched, unmatched

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabaseAdmin
        .from('master_products')
        .select(`
            *,
            matches:product_marketplace_matches(*)
        `, { count: 'exact' })
        .eq('organization_id', orgId);

    if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Since filtering by "match status" (foreign table count) is hard in Supabase simple query,
    // we can't easily pagination + filter in SQL without a RPC or View.
    // OPTION 1: Filter in memory (breaks pagination on large sets, but easiest now)
    // OPTION 2: Just paginate regardless of match status for now, and apply match filter on current page (Bad)

    // Compromise for now: If matchStatus is 'all', use DB pagination.
    // If filtered, fetch more (e.g. 1000) and filter in memory, then paginate. (Not ideal but fast solution).
    // Or just use DB pagination for everything and let the client handle complex logic? 
    // No, user specifically requested server side pagination.

    // For 'all' status:
    if (matchStatus === 'all') {
        query = query.range(start, end).order('created_at', { ascending: false });
        const { data, count, error } = await query;
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, products: data, total: count });
    }

    // For specific match status (Filtering in memory for now because we lack a View/RPC)
    // To support this proper server-side, we would need a wrapper logic, but let's fetch a larger chunk to be safe
    // or just return unpaginated but filtered list if it's not huge?
    // Let's assume the set is < 2000 for now and do in-memory filter + paginate.
    if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);

    const { data: allData, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    let filtered = allData || [];
    if (matchStatus === 'matched') {
        filtered = filtered.filter((p: any) => p.matches && p.matches.length > 0);
    } else if (matchStatus === 'unmatched') {
        filtered = filtered.filter((p: any) => !p.matches || p.matches.length === 0);
    }

    const total = filtered.length;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({ success: true, products: paginated, total });
}

export async function POST(request: NextRequest) {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { master_product_id, marketplace, remote_product_id, remote_variant_id, remote_data } = body;

    // Verify ownership of the master product
    const { data: product, error: pError } = await supabaseAdmin
        .from('master_products')
        .select('id')
        .eq('id', master_product_id)
        .eq('organization_id', orgId)
        .single();

    if (pError || !product) {
        return NextResponse.json({ success: false, error: "Ürün bulunamadı veya yetkiniz yok" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from('product_marketplace_matches')
        .insert({
            master_product_id,
            marketplace,
            remote_product_id,
            remote_variant_id,
            match_score: 100, // Manual match
            remote_data
        })
        .select()
        .single();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, match: data });
}

export async function DELETE(request: NextRequest) {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    // Verify ownership via master_product relation (since matches might not have org_id directly)
    // Or just try to delete where master_product belongs to org.
    // Assuming a join is needed or matches has org_id (it likely doesn't).
    // Safer: Get the match -> get product -> check orgId.

    // Step 1: Get the match to find master_product_id
    const { data: match, error: mError } = await supabaseAdmin
        .from('product_marketplace_matches')
        .select('master_product_id')
        .eq('id', id)
        .single();

    if (mError || !match) return NextResponse.json({ success: false, error: "Match not found" }, { status: 404 });

    // Step 2: Verify master product belongs to org
    const { data: product, error: pError } = await supabaseAdmin
        .from('master_products')
        .select('id')
        .eq('id', match.master_product_id)
        .eq('organization_id', orgId)
        .single();

    if (pError || !product) {
        return NextResponse.json({ success: false, error: "Yetkisiz silme işlemi" }, { status: 403 });
    }

    // Step 3: Delete
    const { error } = await supabaseAdmin
        .from('product_marketplace_matches')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
