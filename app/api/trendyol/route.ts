import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // 1. URL'den Mağaza ID'sini al
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
        return NextResponse.json({ error: "Account ID gerekli (Hangi mağaza?)" }, { status: 400 });
    }

    // 2. Veritabanından o mağazanın API bilgilerini çek
    const { data: account, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

    if (error || !account) {
        return NextResponse.json({ error: "Mağaza bulunamadı." }, { status: 404 });
    }

    const supplierId = account.supplier_id;
    const apiKey = account.api_key;
    const apiSecret = account.api_secret;

    // --- BURADAN AŞAĞISI SENİN GÜÇLÜ ALGORİTMAN ---
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
    
    // Test için süreyi kısa tutabiliriz veya 1 ay yapabiliriz
    const MONTHS_TO_FETCH = 1; 
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    
    const chunks = Math.ceil((MONTHS_TO_FETCH * 30) / 14); 
    const requests = [];

    // Paralel İstekleri Hazırla
    for (let i = 0; i < chunks; i++) {
      const endDate = Date.now() - (i * TWO_WEEKS_MS);
      const startDate = endDate - TWO_WEEKS_MS;
      
      const url = `https://api.trendyol.com/sapigw/suppliers/${supplierId}/orders?orderBy=CreatedDate&size=200&startDate=${startDate}&endDate=${endDate}`;
      
      requests.push(
        fetch(url, {
          headers: { "Authorization": `Basic ${auth}` }
        }).then(res => res.json())
      );
    }

    const results = await Promise.all(requests);
    
    let allOrders: any[] = [];
    results.forEach(res => {
      if (res.content) allOrders = [...allOrders, ...res.content];
    });

    // 3. Veriyi Formatla (Store ID Ekleyerek)
    const formattedOrders = allOrders.map((pkg: any) => {
      // Türkçe Statü Çevirisi
      let myStatus = pkg.status;
      const s = pkg.status;
      if (s === "Created") myStatus = "Yeni";
      else if (s === "Picking" || s === "Invoiced") myStatus = "Hazırlanıyor";
      else if (s === "Shipped") myStatus = "Kargoda";
      else if (s === "Delivered") myStatus = "Teslim Edildi";
      else if (s === "Cancelled") myStatus = "İptal";
      else if (s === "Returned" || s === "UnDelivered") myStatus = "İade";
      else if (s === "Repackaged") myStatus = "Hazırlanıyor";

      const orderDate = new Date(pkg.orderDate).toISOString();
      const firstLine = pkg.lines && pkg.lines.length > 0 ? pkg.lines[0] : {};

      return {
        id: pkg.orderNumber,
        packet_id: pkg.id,
        order_number: pkg.orderNumber,
        platform: 'Trendyol',
        store_id: account.id, // <--- KRİTİK: Hangi mağazaya ait olduğu
        status: myStatus,
        original_status: pkg.status,
        customer_name: pkg.shipmentAddress.fullName,
        customer_email: pkg.customerEmail,
        total_price: pkg.grossAmount,
        cargo_tracking_number: pkg.cargoTrackingNumber?.toString(),
        cargo_provider_name: pkg.cargoProviderName,
        cargo_tracking_link: pkg.cargoTrackingLink,
        product_count: pkg.lines.reduce((acc: number, l: any) => acc + l.quantity, 0),
        first_product_name: firstLine.productName || "Ürün Adı Yok",
        first_product_code: firstLine.merchantSku || firstLine.barcode,
        order_date: orderDate,
        raw_data: pkg
      };
    });

    // Tekrar eden siparişleri temizle (Unique)
    const uniqueOrders = Array.from(new Map(formattedOrders.map((item:any) => [item.id, item])).values());

    return NextResponse.json({ success: true, orders: uniqueOrders });

  } catch (error: any) {
    console.error("API Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}