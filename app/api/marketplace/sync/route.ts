import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: account, error: accountError } = await supabase
      .from('marketplace_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) return NextResponse.json({ error: 'Mağaza bulunamadı!' }, { status: 404 });

    // --- KRİTİK DÜZELTME: SÜREYİ 7 GÜNE DÜŞÜRDÜK (TIMEOUT ÖNLEME) ---
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Sadece 1 Hafta
    
    const startDateTimestamp = startDate.getTime(); 
    const startDateISO = startDate.toISOString();

    let orders = [];

    // --- WOOCOMMERCE ---
    if (account.platform.toLowerCase().includes('woocommerce') || account.platform.toLowerCase().includes('woo')) {
      const baseUrl = account.base_url?.replace(/\/$/, "") || account.store_url?.replace(/\/$/, ""); 
      const url = `${baseUrl}/wp-json/wc/v3/orders?per_page=50&after=${startDateISO}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;
      
      const response = await fetch(url, { headers: { 'User-Agent': 'OrtakBarkod/1.0' } });
      if (!response.ok) throw new Error(`WooCommerce Hatası: ${response.status}`);
      const wooData = await response.json();
      
      orders = wooData.map((o: any) => ({
        user_id: account.user_id,
        store_id: account.id,
        platform: 'WooCommerce',
        order_number: String(o.id),
        customer_name: `${o.billing.first_name} ${o.billing.last_name}`,
        total_price: parseFloat(o.total),
        currency: o.currency,
        status: o.status, // Olduğu gibi alalım, frontend renklendirsin
        order_date: o.date_created,
        product_count: o.line_items.reduce((acc: number, item: any) => acc + item.quantity, 0),
        first_product_name: o.line_items[0]?.name || "Ürün Yok",
        first_product_code: o.line_items[0]?.sku || "",
        raw_data: o 
      }));
    }
    // --- TRENDYOL ---
    else if (account.platform.toLowerCase().includes('trendyol')) {
      const url = `https://api.trendyol.com/sapigw/suppliers/${account.supplier_id}/orders?startDate=${startDateTimestamp}&size=100`; 
      const auth = Buffer.from(`${account.api_key}:${account.api_secret}`).toString('base64');
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': 'OrtakBarkod_SaaS' }
      });
      if (!response.ok) throw new Error(`Trendyol Hatası: ${response.status}`);
      const data = await response.json();
      
      orders = (data.content || []).map((o: any) => ({
        user_id: account.user_id,
        store_id: account.id,
        platform: 'Trendyol',
        order_number: o.orderNumber,
        customer_name: `${o.customerFirstName} ${o.customerLastName}`,
        total_price: o.totalPrice,
        currency: o.currencyCode || 'TRY',
        status: o.status,
        order_date: new Date(o.orderDate).toISOString(),
        product_count: o.lines.length,
        first_product_name: o.lines[0]?.productName || "-",
        first_product_code: o.lines[0]?.merchantSku || "-",
        cargo_tracking_number: o.cargoTrackingNumber,
        cargo_provider_name: o.cargoProviderName,
        raw_data: o
      }));
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