import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/accessControl";
import https from 'https';

// 1. BİLGİLERİ BURAYA SABİT GİRİYORUZ (Hata riskini sıfırlamak için)
const MERCHANT_ID = "94f74d48-9dc4-4a5f-854a-a5327f2162a8";
const API_KEY = "CQPuy2CaVenX"; // Servis Anahtarı

// Node.js HTTPS modülü (SSL hatası yoksayma özellikli)
function fetchWithNode(url: string, auth: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; OrtakBarkod/1.0)"
      },
      rejectUnauthorized: false, // SSL Hatalarını Yoksay
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          // Başarılı cevap (200-299 arası)
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HB HATA KODU: ${res.statusCode} - Mesaj: ${data}`));
          }
        } catch (e) {
          reject(new Error("Gelen veri JSON değil: " + data.substring(0, 100)));
        }
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // TODO: Fetch credentials from DB using orgId instead of hardcoded
  // For now, we keep hardcoded but at least ensure user is logged in.
  // Basic Auth Şifreleme
  const auth = Buffer.from(`${MERCHANT_ID}:${API_KEY}`).toString("base64");

  // --- TAKTİK DEĞİŞİKLİĞİ: 'orders' yerine 'packages' servisini deniyoruz ---
  // Bu servis kargo işlemleri için daha doğrudur.
  // status=0 (Hazırlanıyor/Unpacked), limit=50
  const url = `https://oms-external.hepsiburada.com/packages/merchantid/${MERCHANT_ID}?version=1&limit=50`;

  try {
    console.log("HB İSTEK GİDİYOR:", url);
    const data: any = await fetchWithNode(url, auth);

    console.log("HB BAŞARILI CEVAP GELDİ!");

    // Hepsiburada yapısı (items veya content olabilir)
    const hbPackages = data.items || data.content || data || [];

    const cleanOrders = hbPackages.map((pkg: any) => {
      let myStatus = "Diğer";
      // Hepsiburada Paket Statüleri
      const s = pkg.status;

      if (s === "Unpacked" || s === "ReadyToPack") myStatus = "Hazırlanıyor";
      else if (s === "Packed" || s === "Shipped" || s === "InTransit") myStatus = "Kargoda";
      else if (s === "Delivered") myStatus = "Teslim Edildi";
      else if (s === "Cancelled") myStatus = "İptal";
      else myStatus = "Yeni";

      return {
        id: pkg.orderNumber,
        packet_id: pkg.id,
        status: myStatus,
        original_status: pkg.status,

        customer_name: pkg.customerName || "HB Müşterisi",
        // HB bazen email vermez
        customer_email: "",

        // Fiyat
        total_price: pkg.totalPrice || 0,

        // Kargo
        cargo_tracking_number: pkg.cargoTrackingNumber,
        cargo_provider_name: pkg.cargoCompany || "Hepsiburada Kargo",

        // Ürün Bilgisi (HB Paket içinde lines döner)
        product_count: pkg.lines ? pkg.lines.length : 1,
        first_product_name: pkg.lines?.[0]?.name || "Ürün",
        first_product_code: pkg.lines?.[0]?.sku || pkg.lines?.[0]?.merchantSku || "-",
        first_product_img: "",

        // Tarih
        order_date: pkg.orderDate ? new Date(pkg.orderDate).toISOString() : new Date().toISOString(),
        shipment_deadline: pkg.dueDate ? new Date(pkg.dueDate).toISOString() : new Date().toISOString(),

        platform: "Hepsiburada",
        raw_data: pkg
      };
    });

    return NextResponse.json({ success: true, count: cleanOrders.length, orders: cleanOrders });

  } catch (error: any) {
    console.error("HB BAĞLANTI HATASI:", error.message);
    // Hata detayını ekrana basalım ki görelim
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}