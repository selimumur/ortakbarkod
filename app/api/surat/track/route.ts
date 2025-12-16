import { NextResponse } from 'next/server';
import { SuratKargoService } from '../../../services/surat-kargo';
// @ts-ignore
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { getOrganizationId } from "@/lib/accessControl";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId } = body;

        const orgId = await getOrganizationId();
        if (!orgId) return NextResponse.json({ isError: true, Message: "Unauthorized" }, { status: 401 });

        if (!orderId) {
            return NextResponse.json({ isError: true, Message: "Sipariş numarası (orderId) zorunludur." }, { status: 400 });
        }

        // 1. Veritabanından Sürat Kargo bilgilerini çek
        const { data: connection, error: dbError } = await supabase
            .from('cargo_connections')
            .select('*')
            .eq('provider', 'Surat')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .limit(1)
            .single();

        if (dbError || !connection) {
            return NextResponse.json({ isError: true, Message: "Sürat Kargo entegrasyonu aktif değil." }, { status: 400 });
        }

        const service = new SuratKargoService(connection.username, connection.password);
        const result = await service.trackShipment(orderId);

        return NextResponse.json(result);

    } catch (error: any) {
        return NextResponse.json({ isError: true, Message: error.message }, { status: 500 });
    }
}
