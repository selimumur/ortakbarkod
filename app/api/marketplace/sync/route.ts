import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { getSupabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    const { userId, orgId } = await auth();
    const tenantId = orgId || userId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Yetkisiz Erişim' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: account, error: accountError } = await supabase
      .from('marketplace_accounts') // FIXED: Reverted to correct table name
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', tenantId)
      .single();

    if (accountError || !account) return NextResponse.json({ error: 'Mağaza bulunamadı!' }, { status: 404 });

    // --- GERİYE DÖNÜK 3 AYLIK VERİ ÇEKME ---
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // 3 Ay (90 Gün)

    const startDateTimestamp = startDate.getTime();
    const startDateISO = startDate.toISOString();

    let orders: any[] = [];

    // --- WOOCOMMERCE ---
    if (account.platform.toLowerCase().includes('woocommerce') || account.platform.toLowerCase().includes('woo')) {
      // URL Bulma Mantığı: base_url yoksa supplier_id (kullanıcı oraya girmiş olabilir)
      let baseUrl = account.base_url || account.store_url || account.url || account.supplier_id;

      // Akıllı Fallback: Eğer URL yoksa ama Mağaza Adı bir domain gibiyse (örn: mobilyafirsat.com) onu kullan
      if (!baseUrl && account.store_name && (account.store_name.includes('.com') || account.store_name.includes('.net') || account.store_name.includes('http'))) {
        baseUrl = account.store_name;
      }

      // Protokol kontrolü (https:// ekle)
      if (baseUrl && !baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
      }
      baseUrl = baseUrl?.replace(/\/$/, "");

      if (!baseUrl) throw new Error("WooCommerce adresi bulunamadı! Lütfen Ayarlar sayfasından mağazayı silip, 'Web Site Adresi' kutusuna site linkini yazarak tekrar ekleyin.");

      const url = `${baseUrl}/wp-json/wc/v3/orders?per_page=50&after=${startDateISO}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;

      const response = await fetch(url, { headers: { 'User-Agent': 'OrtakBarkod/1.0' } });
      if (!response.ok) throw new Error(`WooCommerce Hatası: ${response.status} URL: ${baseUrl}`);
      const wooData = await response.json();

      orders = (wooData || []).map((o: any) => {
        // WooCommerce Statü Çevirisi
        let myStatus = "Diğer";
        const s = o.status;

        if (s === "pending" || s === "on-hold") myStatus = "Yeni";
        else if (s === "processing") myStatus = "Hazırlanıyor";
        else if (s === "completed") myStatus = "Teslim Edildi";
        else if (s === "cancelled" || s === "failed") myStatus = "İptal";
        else if (s === "refunded") myStatus = "İade";

        return {
          organization_id: tenantId,
          store_id: account.id,
          platform: 'WooCommerce',
          order_number: String(o.id),
          customer_name: `${o.billing.first_name} ${o.billing.last_name}`,
          total_price: parseFloat(o.total),
          currency: o.currency,
          status: myStatus,
          order_date: o.date_created,
          product_count: o.line_items.reduce((acc: number, item: any) => acc + item.quantity, 0),
          first_product_name: o.line_items[0]?.name || "Ürün Yok",
          first_product_code: o.line_items[0]?.sku || "",
          raw_data: o
        };
      });
    }
    // --- TRENDYOL ---
    else if (account.platform.toLowerCase().includes('trendyol')) {
      const auth = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');

      // 3 AYLIK CHUNK FETCH (14 günlük dilimlerle)
      const MONTHS_TO_FETCH = 3;
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
      const chunks = Math.ceil((MONTHS_TO_FETCH * 30) / 14);

      const requests = [];
      for (let i = 0; i < chunks; i++) {
        const endDate = Date.now() - (i * TWO_WEEKS_MS);
        const startDate = endDate - TWO_WEEKS_MS;

        const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/orders?orderBy=LastModifiedDate&orderByDirection=DESC&size=200&startDate=${startDate}&endDate=${endDate}`;

        requests.push(
          fetch(url, { headers: { 'Authorization': `Basic ${auth}` } })
            .then(async res => {
              if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Trendyol API Hatası (${res.status}): ${errText}`);
              }
              return res.json();
            })
        );
      }

      const results = await Promise.all(requests);
      let trendData: any[] = [];
      results.forEach(res => {
        if (res && res.content) trendData = [...trendData, ...res.content];
      });

      orders = trendData.map((o: any) => {
        // Türkçe Statü Çevirisi
        let myStatus = o.status;
        const s = o.status;
        if (s === "Created") myStatus = "Yeni";
        else if (s === "Picking" || s === "Invoiced") myStatus = "Hazırlanıyor";
        else if (s === "Shipped") myStatus = "Kargoda";
        else if (s === "Delivered") myStatus = "Teslim Edildi";
        else if (s === "Cancelled") myStatus = "İptal";
        else if (s === "Returned" || s === "UnDelivered") myStatus = "İade";
        else if (s === "Repackaged") myStatus = "Hazırlanıyor";

        // Deadline extraction logic
        const deadline = o.shipmentPackageStatus?.plannedShipmentDate
          ? new Date(o.shipmentPackageStatus.plannedShipmentDate).toISOString()
          : (o.agreedDeliveryDate ? new Date(o.agreedDeliveryDate).toISOString() : null);

        // Inject into raw_data to ensure persistence even if DB column is missing
        o.shipment_deadline = deadline;

        return {
          organization_id: tenantId,
          store_id: account.id,
          platform: 'Trendyol',
          order_number: o.orderNumber,
          customer_name: `${o.customerFirstName || ''} ${o.customerLastName || ''}`.trim(),
          total_price: o.totalPrice,
          currency: o.currencyCode || 'TRY',
          status: myStatus,
          order_date: new Date(o.orderDate).toISOString(),
          product_count: o.lines.reduce((acc: number, l: any) => acc + l.quantity, 0),
          first_product_name: o.lines[0]?.productName || "-",
          first_product_code: o.lines[0]?.merchantSku || "-",
          cargo_tracking_number: o.cargoTrackingNumber?.toString(),
          cargo_provider_name: o.cargoProviderName,
          cargo_tracking_link: o.cargoTrackingLink,
          raw_data: o
        };
      });
    }

    // --- KAYDET ---
    if (orders.length > 0) {
      const { error } = await supabase.from('orders').upsert(orders, { onConflict: 'order_number' });
      if (error) throw new Error("DB Hatası: " + error.message);
    }

    return NextResponse.json({ success: true, message: `${orders.length} sipariş çekildi!`, count: orders.length });

  } catch (error: any) {
    console.error('Sync Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}