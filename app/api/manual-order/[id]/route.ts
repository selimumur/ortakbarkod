
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { auth } from "@clerk/nextjs/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const orderId = parseInt(id);
        if (isNaN(orderId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('organization_id', userId)
            .single();

        if (error) {
            console.error("API Fetch Error:", error);
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
