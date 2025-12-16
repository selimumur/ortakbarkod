
import { NextResponse } from 'next/server';
import { SuratKargoService } from '../../../services/surat-kargo';
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getOrganizationId } from "@/lib/accessControl";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ isError: true, Message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // 1. Veritabanından Sürat Kargo bilgilerini çek (Scoped to Org)
    const { data: connection, error: dbError } = await supabase
      .from('cargo_connections')
      .select('*')
      .eq('organization_id', orgId) // SECURITY FIX
      .eq('provider', 'Surat')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (dbError || !connection) {
      console.error("SURAT API: No active connection for user", orgId);
      return NextResponse.json({ isError: true, Message: "Sürat Kargo entegrasyonu bulunamadı. Lütfen Ayarlar sayfasından bilgilerinizi kontrol ediniz." }, { status: 400 });
    }

    // 2. Servisi başlat
    const service = new SuratKargoService(connection.username, connection.password);

    console.log("SURAT API: Creating shipment...");
    const result = await service.createShipment({
      AliciAdresi: body.address,
      Il: body.city,
      Ilce: body.district,
      TelefonCep: body.phone,
      KisiKurum: body.name,
      OzelKargoTakipNo: body.orderId,
      KapidanOdemeTutari: body.amount
    }, body.scenario);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("SURAT API Error:", error);
    return NextResponse.json({ isError: true, Message: error.message }, { status: 500 });
  }
}