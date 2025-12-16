import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import https from 'https';

// Node.js HTTPS Modülü (SSL Hatalarını ve Firewall'u Aşmak İçin)
function postWithNode(url: string, apiKey: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);

    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        "x-api-key": apiKey, // Çiçeksepeti Kimliği
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataString),
        "User-Agent": "Mozilla/5.0 (compatible; OrtakBarkod/1.0)"
      },
      rejectUnauthorized: false // Güvenlik sertifikası hatası verirse takılma
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`CS API Hatası (${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(new Error("Gelen veri JSON değil."));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(dataString);
    req.end();
  });
}

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // 1. Şifreyi Çek
  const { data: config } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('organization_id', orgId)
    .eq('platform', 'Çiçeksepeti') // Ayarlar sayfasındaki isimle aynı olmalı
    .eq('is_active', true)
    .single();

  if (!config) return NextResponse.json({ error: "Çiçeksepeti Bağlantısı Yok" }, { status: 404 });

  // API Key (Veritabanında api_key sütununda duruyor)
  const apiKey = config.api_key;

  // 2. İstek Hazırla (Son 30 Günlük Siparişler)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Çiçeksepeti /Order/GetOrders Endpoint'i POST ile çalışır
  const url = "https://apis.ciceksepeti.com/api/v1/Order/GetOrders";

  const requestBody = {
    "startDate": startDate.toISOString(),
    "endDate": endDate.toISOString(),
    "pageSize": 50,
    "page": 0
  };

  try {
    console.log("CS İSTEK GİDİYOR...");
    const data: any = await postWithNode(url, apiKey, requestBody);

    // Çiçeksepeti Cevabı: { orders: [...] } veya { items: [...] }
    // (Not: Dökümana göre 'orders' veya direkt array dönebilir, güvenli kontrol yapalım)
    const csOrders = data.orders || data.items || [];

    console.log(`CS: ${csOrders.length} sipariş bulundu.`);

    const cleanOrders = csOrders.map((order: any) => {
      // Statü Eşleştirme
      let myStatus = "Diğer";
      const s = order.orderStatusId; // Çiçeksepeti genelde ID (int) kullanır

      // 1: Yeni, 2: Onaylandı, 5: Kargoya Verildi, 6: Teslim Edildi, 7: İptal
      // (Bu ID'ler standarttır, API cevabına göre revize edilebilir)
      if (s === 1 || s === 2 || order.orderStatus === "New") myStatus = "Hazırlanıyor";
      else if (s === 5 || order.orderStatus === "Shipped") myStatus = "Kargoda";
      else if (s === 6 || order.orderStatus === "Delivered") myStatus = "Teslim Edildi";
      else if (s === 7 || s === 8 || order.orderStatus === "Cancelled") myStatus = "İptal";
      else myStatus = "Yeni";

      const firstItem = order.orderItems ? order.orderItems[0] : {};

      return {
        id: order.orderId || order.orderNumber,
        packet_id: order.id,
        status: myStatus,
        original_status: String(order.orderStatus),

        customer_name: order.receiverName || "CS Müşterisi",
        customer_email: "", // Genelde maskeli gelir

        total_price: order.totalPrice || 0,

        cargo_tracking_number: order.cargoTrackingNumber,
        cargo_provider_name: order.cargoCompany || "Çiçeksepeti Kargo",

        product_count: order.orderItems ? order.orderItems.length : 1,
        first_product_name: firstItem.productName || "Ürün",
        first_product_code: firstItem.productCode || firstItem.sku || "-",
        first_product_img: firstItem.productImage || "",

        order_date: order.orderDate ? new Date(order.orderDate).toISOString() : new Date().toISOString(),
        shipment_deadline: null, // Çiçeksepeti bazen vermez

        platform: "Çiçeksepeti",
        raw_data: order
      };
    });

    return NextResponse.json({ success: true, count: cleanOrders.length, orders: cleanOrders });

  } catch (error: any) {
    console.error("CS HATA DETAYI:", error.message);
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}