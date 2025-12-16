import { NextResponse } from "next/server";

import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { barcodes, accountId } = await req.json(); // accountId optional

  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Fetch credentials
  let supplierId, apiKey, apiSecret;

  if (accountId) {
    const { data } = await supabase.from('marketplace_accounts').select('*').eq('id', accountId).eq('organization_id', orgId).single();
    if (data) {
      supplierId = data.supplier_id;
      apiKey = data.api_key;
      apiSecret = data.api_secret;
    }
  } else {
    // Fallback: try to find any Trendyol account for this org
    const { data } = await supabase.from('marketplace_accounts').select('*').eq('organization_id', orgId).ilike('platform', '%trendyol%').limit(1).single();
    if (data) {
      supplierId = data.supplier_id;
      apiKey = data.api_key;
      apiSecret = data.api_secret;
    }
  }

  // Final Fallback to ENV - removed to enforce DB usage (or keep if user really wants mixed mode, but safety first)
  // if (!supplierId) supplierId = process.env.TRENDYOL_SUPPLIER_ID;

  if (!supplierId || !apiKey) return NextResponse.json({ error: "Trendyol Entegrasyonu Bulunamadı. Lütfen ayarlar sayfasından mağazanızı bağlayın." }, { status: 404 });

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // DÖKÜMAN : Ürün Buybox Kontrol Servisi
  // Limit: Tek seferde 10 barkod sorgulanabilir.
  const url = `https://api.trendyol.com/integration/product/sellers/${supplierId}/products/buybox-information`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": `${supplierId} - SelfIntegration`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ barcodes }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const err = await response.text();
      // HTML dönerse (Cloudflare)
      if (err.includes("<!DOCTYPE html>")) return NextResponse.json({ error: "Güvenlik Duvarı" }, { status: 403 });
      return NextResponse.json({ error: "Trendyol Hatası", details: err }, { status: response.status });
    }

    const data = await response.json();
    // Cevap: buyboxOrder, buyboxPrice, hasMultipleSeller
    return NextResponse.json({ success: true, data: data.buyboxInfo });

  } catch (error) {
    return NextResponse.json({ error: "Sunucu Hatası", details: String(error) }, { status: 500 });
  }
}