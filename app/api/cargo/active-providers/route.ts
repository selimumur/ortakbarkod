import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.error("Active Providers API: No session found");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('cargo_connections')
        .select('id, provider')
        .eq('is_active', true);

    if (error) {
        console.error("Active Providers API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Active Providers API Data:", data);
    return NextResponse.json(data);
}
