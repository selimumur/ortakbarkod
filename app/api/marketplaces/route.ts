import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrganizationId } from "@/lib/accessControl";

// Helper to get admin client
const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    // Assuming user_id column exists and is used for ownership
    const { data, error } = await supabase.from('marketplace_accounts').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, marketplaces: data });
}

export async function POST(req: Request) {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const supabase = getSupabaseAdmin();

        // Add user_id to the payload to ensure ownership
        const payload = { ...body, organization_id: orgId };

        const { data, error } = await supabase.from('marketplace_accounts').insert([payload]).select();

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    // SECURITY: MUST enforce user_id to prevent deleting others' data
    const { error } = await supabase.from('marketplace_accounts').delete().eq('id', id).eq('organization_id', orgId);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
