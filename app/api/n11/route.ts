import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';
import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { XMLParser } from 'fast-xml-parser'; // XML okuyucu

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // 1. Şifreleri Çek
  const { data: config } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('organization_id', orgId)
    .eq('platform', 'N11')
    .eq('is_active', true)
    .single();

  if (!config) return NextResponse.json({ error: "N11 Bağlantısı Yok" }, { status: 404 });

  // N11 XML İsteği Hazırla (Son 30 Günlük Siparişler)
  // Dökümana göre OrderList servisini kullanıyoruz.
  const endDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '/'); // DD/MM/YYYY formatı lazım
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - 30);
  const startDate = startDateObj.toLocaleDateString('en-GB').replace(/\//g, '/');

  const xmlRequest = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://www.n11.com/ws/schemas">
       <soapenv:Header/>
       <soapenv:Body>
          <sch:OrderListRequest>
             <auth>
                <appKey>${config.api_key}</appKey>
                <appSecret>${config.api_secret}</appSecret>
             </auth>
             <searchData>
                <period>
                   <startDate>${startDate}</startDate>
                   <endDate>${endDate}</endDate>
                </period>
             </searchData>
          </sch:OrderListRequest>
       </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await fetch("https://api.n11.com/ws/OrderService.wsdl", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": ""
      },
      body: xmlRequest,
      cache: 'no-store'
    });

    const xmlText = await response.text();

    // XML'i JSON'a Çevir
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonObj = parser.parse(xmlText);

    // N11 Cevap Analizi
    // Cevap yapısı: Envelope -> Body -> OrderListResponse -> orderList -> order
    const responseBody = jsonObj['env:Envelope']?.['env:Body']?.['ns3:OrderListResponse'];

    // Hata Kontrolü
    if (!responseBody || responseBody?.result?.status === 'failure') {
      return NextResponse.json({ error: "N11 API Hatası", details: responseBody?.result?.errorMessage || "Bilinmeyen Hata" }, { status: 500 });
    }

    let orders = responseBody?.orderList?.order || [];
    // Tek sipariş varsa array olmayabilir, array yapalım
    if (!Array.isArray(orders)) {
      orders = [orders];
    }

    const cleanOrders = orders.map((order: any) => {
      // Statü Eşleştirme (N11 -> Bizim Dil)
      // N11 Statüleri: New, Approved, Rejected, Shipped, Delivered, Completed
      let myStatus = "Diğer";
      const s = order.status; // 1, 2, 3 gibi sayı veya New, Approved gibi string gelebilir.

      // Dökümana ve tecrübeye göre eşleştirme:
      if (s === "New" || s === "Approved" || s == 1 || s == 2) myStatus = "Hazırlanıyor";
      if (s === "Shipped" || s == 3) myStatus = "Kargoda";
      if (s === "Delivered" || s === "Completed" || s == 4) myStatus = "Teslim Edildi";
      if (s === "Rejected" || s == 5) myStatus = "İptal";

      // Ürün Bilgisi (ItemList)
      let productItem = order.itemList?.item;
      // Eğer birden fazla ürün varsa ilkini al
      if (Array.isArray(productItem)) productItem = productItem[0];

      return {
        id: order.orderNumber,
        packet_id: order.id,
        status: myStatus,
        original_status: String(s),

        customer_name: order.billingAddress?.fullName || "N11 Müşterisi",
        customer_email: "", // N11 vermeyebilir
        tax_number: order.billingAddress?.taxId || order.billingAddress?.tcId,

        total_price: order.totalAmount || 0,

        cargo_tracking_number: order.trackingNumber,
        cargo_provider_name: "N11 Kargo", // Genelde N11 kampanya kodu ile gider

        product_count: Array.isArray(order.itemList?.item) ? order.itemList.item.length : 1,
        first_product_name: productItem?.productName || "Ürün",
        first_product_code: productItem?.sellerStockCode || productItem?.productId || "-",
        first_product_img: "", // N11 sipariş listesinde resim vermez

        order_date: new Date(order.createDate).toISOString(),
        // N11 Termin süresi (Yoksa +3 gün ekle)
        shipment_deadline: new Date(new Date(order.createDate).setDate(new Date(order.createDate).getDate() + 3)).toISOString(),

        platform: "N11",
        raw_data: order
      };
    });

    return NextResponse.json({ success: true, count: cleanOrders.length, orders: cleanOrders });

  } catch (error: any) {
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}