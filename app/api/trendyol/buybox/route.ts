import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { barcodes } = await req.json(); // Ön yüzden barkod listesi gelecek
  
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;
  const apiKey = process.env.TRENDYOL_API_KEY;
  const apiSecret = process.env.TRENDYOL_API_SECRET;

  if (!supplierId || !apiKey) return NextResponse.json({ error: "API Eksik" }, { status: 500 });

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