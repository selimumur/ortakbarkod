import { NextResponse } from "next/server";
import { getOrganizationId } from "@/lib/accessControl";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    // 1. HESAPLARI BELİRLE
    let accountsToSync = [];

    if (accountId) {
      // Tekil Mağaza + Org Check
      const { data: account } = await supabase.from('marketplace_accounts').select('*').eq('id', accountId).eq('organization_id', orgId).single();
      if (account) accountsToSync.push(account);
    } else {
      // TÜM Mağazalar (Trendyol olanlar) + Org Check
      const { data: accounts } = await supabase.from('marketplace_accounts').select('*').eq('organization_id', orgId);
      if (accounts) accountsToSync = accounts.filter((a: any) => a.platform === 'Trendyol' || !a.platform || a.platform === 'trendyol');
    }

    if (accountsToSync.length === 0) {
      // If no accounts found, it might be RLS or just empty.
      // We return simpler error or empty list
      return NextResponse.json({ success: true, count: 0, orders: [], message: "Bağlı Trendyol mağazası bulunamadı." }, { status: 200 });
    }

    let totalSynced = 0;
    const allUniqueOrders: any[] = [];

    // 2. HER MAĞAZA İÇİN DÖNGÜ
    for (const account of accountsToSync) {
      const { supplier_id, api_key, api_secret } = account;
      if (!supplier_id || !api_key || !api_secret) continue;

      const auth = Buffer.from(`${api_key}:${api_secret}`).toString("base64");

      // 3 AY TARAMA (14 günlük chunklar)
      const MONTHS_TO_FETCH = 3;
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
      const chunks = Math.ceil((MONTHS_TO_FETCH * 30) / 14);

      const requests = [];
      for (let i = 0; i < chunks; i++) {
        const endDate = Date.now() - (i * TWO_WEEKS_MS);
        const startDate = endDate - TWO_WEEKS_MS;

        const url = `https://api.trendyol.com/sapigw/suppliers/${supplier_id}/orders?orderBy=CreatedDate&size=200&startDate=${startDate}&endDate=${endDate}`;
        requests.push(fetch(url, { headers: { "Authorization": `Basic ${auth}` } }).then(res => res.json()));
      }

      // ... (Previous fetching logic remains until results array)

      const results = await Promise.all(requests);
      let storeOrders: any[] = [];
      results.forEach(res => {
        if (res && res.content) storeOrders = [...storeOrders, ...res.content];
      });

      console.log(`${account.store_name}: ${storeOrders.length} orders found. Syncing to DB...`);

      // DB SAVE LOGIC
      for (const pkg of storeOrders) {
        // 1. Save Order
        const orderDate = new Date(pkg.orderDate).toISOString();
        const { data: savedOrder, error: orderError } = await supabase
          .from('marketplace_orders')
          .upsert({
            store_id: account.id,
            marketplace_order_id: pkg.orderNumber,
            customer_name: `${pkg.shipmentAddress.firstName || ''} ${pkg.shipmentAddress.lastName || ''}`.trim(),
            customer_email: pkg.customerEmail,
            total_amount: pkg.grossAmount,
            currency: pkg.currencyCode || 'TRY',
            order_date: orderDate,
            status: pkg.status,
            raw_data: pkg,
            organization_id: account.organization_id // Explicitly save Organization ID
          }, { onConflict: 'store_id, marketplace_order_id' })
          .select('id')
          .single();

        if (orderError) {
          console.error("Order Save Error:", orderError);
          continue;
        }

        if (!savedOrder) continue;

        // 2. Save Lines
        // First delete existing items to avoid duplicates on re-sync (simple approach)
        await supabase.from('marketplace_order_items').delete().eq('order_id', savedOrder.id);

        for (const line of pkg.lines) {
          // Find local product
          let productId = null;
          const { data: localProd } = await supabase
            .from('master_products')
            .select('id')
            .or(`code.eq.${line.merchantSku},barcode.eq.${line.barcode}`)
            .limit(1)
            .single();

          if (localProd) productId = localProd.id;

          await supabase.from('marketplace_order_items').insert({
            order_id: savedOrder.id,
            product_id: productId,
            marketplace_sku: line.merchantSku,
            product_name: line.productName,
            quantity: line.quantity,
            unit_price: line.price,
            line_total: line.amount, // or quantity * price
            raw_data: line
          });
        }

        totalSynced++;
      }

      // Add to unique list for response (backward compatibility)
      const formatted = storeOrders.map((pkg: any) => {
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
          store_id: account.id,
          user_id: orgId,
          status: myStatus,
          original_status: pkg.status,
          customer_name: `${pkg.shipmentAddress.firstName || ''} ${pkg.shipmentAddress.lastName || ''}`.trim(),
          customer_email: pkg.customerEmail,
          total_price: pkg.grossAmount,
          cargo_tracking_number: pkg.cargoTrackingNumber?.toString(),
          cargo_provider_name: pkg.cargoProviderName,
          cargo_tracking_link: pkg.cargoTrackingLink,
          product_count: pkg.lines.reduce((acc: number, l: any) => acc + l.quantity, 0),
          first_product_name: firstLine.productName || "Ürün Adı Yok",
          first_product_code: firstLine.merchantSku || firstLine.barcode,
          order_date: orderDate,
          raw_data: pkg,
          organization_id: orgId // Explicitly map to organization_id
        };
      });

      allUniqueOrders.push(...formatted);
    } // End Store Loop

    return NextResponse.json({ success: true, count: totalSynced, orders: allUniqueOrders }, { status: 200 });

  } catch (error: any) {
    console.error("API Hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}