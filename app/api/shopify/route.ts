import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // 1. Şifreleri Çek
  const { data: config } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('platform', 'Shopify')
    .eq('is_active', true)
    .single();

  if (!config) return NextResponse.json({ error: "Shopify Bağlantısı Yok" }, { status: 404 });

  // Shopify Bilgileri
  // supplier_id = mağaza adı (örn: magazad.myshopify.com)
  // api_key = Access Token (shpat_...)
  const shopUrl = config.supplier_id.includes('.') ? config.supplier_id : `${config.supplier_id}.myshopify.com`;
  const accessToken = config.api_key;

  const url = `https://${shopUrl}/admin/api/2024-01/orders.json?status=any&limit=50`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json"
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Shopify Hatası", details: errText }, { status: response.status });
    }

    const data = await response.json();
    const shopifyOrders = data.orders || [];

    const cleanOrders = shopifyOrders.map((order: any) => {
      // Statü Eşleştirme
      let myStatus = "Yeni";
      if (order.fulfillment_status === "fulfilled") myStatus = "Kargoda";
      else if (order.financial_status === "paid" && !order.fulfillment_status) myStatus = "Hazırlanıyor";
      else if (order.cancelled_at) myStatus = "İptal";

      const firstItem = order.line_items ? order.line_items[0] : {};

      return {
        id: order.id, 
        packet_id: order.order_number, 
        status: myStatus,
        original_status: order.financial_status,
        
        customer_name: order.shipping_address ? `${order.shipping_address.first_name} ${order.shipping_address.last_name}` : "Shopify Müşterisi",
        customer_email: order.email,
        
        total_price: order.total_price,
        
        cargo_tracking_number: "", // Shopify'dan ayrıca çekilmesi gerekebilir
        cargo_provider_name: "Shopify Kargo",
        
        product_count: order.line_items.length,
        first_product_name: firstItem.name || "Ürün",
        first_product_code: firstItem.sku || "-",
        first_product_img: "", // Shopify order listesinde resim url'i direkt gelmez, ürün ID ile çekilir (Basitlik için boş)
        
        order_date: new Date(order.created_at).toISOString(),
        shipment_deadline: null,
        
        platform: "Shopify", 
        raw_data: order
      };
    });

    return NextResponse.json({ success: true, count: cleanOrders.length, orders: cleanOrders });

  } catch (error: any) {
    return NextResponse.json({ error: "Sunucu Hatası", details: error.message }, { status: 500 });
  }
}