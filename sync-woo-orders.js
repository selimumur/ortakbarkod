
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncWoo() {
    console.log("--- SYNCING WOOCOMMERCE ORDERS (ID: 8) ---");

    // 1. Get Account
    const { data: account, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('id', 8)
        .single();

    if (error) { console.error("DB Error:", error); return; }

    // 2. Build URL
    let baseUrl = account.base_url || account.store_url || account.url || account.supplier_id;
    if (!baseUrl && account.store_name && (account.store_name.includes('.com') || account.store_name.includes('.net') || account.store_name.includes('http'))) {
        baseUrl = account.store_name;
    }
    if (baseUrl && !baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    baseUrl = baseUrl?.replace(/\/$/, "");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startDateISO = startDate.toISOString();

    const url = `${baseUrl}/wp-json/wc/v3/orders?per_page=50&after=${startDateISO}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;
    console.log(`Fetching from ${baseUrl}...`);

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'OrtakBarkod/1.0' } });
        if (!response.ok) {
            const txt = await response.text();
            console.error(`Error Body: ${txt}`);
            return;
        }

        const data = await response.json();
        console.log(`Fetched ${data.length} orders. Processing...`);

        const orders = data.map(o => {
            let myStatus = "Diğer";
            const s = o.status;
            if (s === "pending" || s === "on-hold") myStatus = "Yeni";
            else if (s === "processing") myStatus = "Hazırlanıyor";
            else if (s === "completed") myStatus = "Teslim Edildi";
            else if (s === "cancelled" || s === "failed") myStatus = "İptal";
            else if (s === "refunded") myStatus = "İade";

            return {
                organization_id: account.organization_id, // Use Account's Org ID
                store_id: account.id,
                platform: 'WooCommerce',
                order_number: String(o.id),
                customer_name: `${o.billing.first_name} ${o.billing.last_name}`,
                total_price: parseFloat(o.total),
                currency: o.currency,
                status: myStatus,
                order_date: o.date_created,
                product_count: o.line_items.reduce((acc, item) => acc + item.quantity, 0),
                first_product_name: o.line_items[0]?.name || "Ürün Yok",
                first_product_code: o.line_items[0]?.sku || "",
                raw_data: o
            };
        });

        if (orders.length > 0) {
            const { error: upsertErr } = await supabase.from('orders').upsert(orders, { onConflict: 'order_number' });
            if (upsertErr) console.error("Upsert Error:", upsertErr.message);
            else console.log("Success! Orders saved to DB.");
        } else {
            console.log("No orders to save.");
        }

    } catch (e) {
        console.error("Exception:", e.message);
    }
}

syncWoo();
