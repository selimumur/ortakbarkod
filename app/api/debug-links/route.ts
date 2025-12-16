
import { NextResponse } from 'next/server';
// @ts-ignore
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('marketplace_product_links')
            .select('*')
            .limit(5);

        return NextResponse.json({
            success: !error,
            table_exists: !error,
            sample: data,
            error: error ? error.message : null
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
