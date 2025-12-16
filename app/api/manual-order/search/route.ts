
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getOrganizationId } from "@/lib/accessControl";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
    try {
        const orgId = await getOrganizationId();
        if (!orgId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        if (!q || q.length < 2) return NextResponse.json([]);

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('master_products')
            .select('id, name, code, stock, price, image_url')
            .eq('organization_id', orgId)
            .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
            .limit(20);

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
