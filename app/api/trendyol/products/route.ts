import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: config } = await supabase.from('marketplace_connections').select('*').eq('organization_id', orgId).eq('platform', 'Trendyol').eq('is_active', true).single();

  const supplierId = config?.supplier_id || process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = config?.api_key || process.env.TRENDYOL_API_KEY;
  const apiSecret = config?.api_secret || process.env.TRENDYOL_API_SECRET;

  if (!supplierId || !apiKey) return NextResponse.json({ error: "API Eksik" }, { status: 500 });

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  // --- KODUN GERİSİ AYNI ---
  const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/products?page=0&size=1000&r=${Math.random()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
        "User-Agent": `${supplierId} - SelfIntegration`,
        "Content-Type": "application/json"
      },
      cache: 'no-store'
    });

    // ... (Geri kalan kodlar aynı) ...
    if (!response.ok) {
      const err = await response.text();
      if (err.includes("<!DOCTYPE html>")) return NextResponse.json({ error: "Güvenlik Duvarı" }, { status: 403 });
      return NextResponse.json({ error: "Trendyol Hatası", details: err }, { status: response.status });
    }
    const data = await response.json();
    const cleanProducts = data.content.map((item: any) => ({
      barcode: item.barcode,
      name: item.title,
      brand: item.brand?.name || "Markasız",
      category: item.categoryName,
      stock: item.quantity,
      price: item.salePrice,
      list_price: item.listPrice,
      model_code: item.stockCode,
      on_sale: !item.archived && item.quantity > 0,
      image_url: item.images && item.images.length > 0 ? item.images[0].url : ""
    }));

    return NextResponse.json({ success: true, count: data.totalElements, products: cleanProducts });
  } catch (error) {
    return NextResponse.json({ error: "Sunucu Hatası", details: String(error) }, { status: 500 });
  }
}