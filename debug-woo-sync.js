
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugWoo() {
    console.log("--- DEBUGGING WOOCOMMERCE SYNC (ID: 8) ---");

    // 1. Get Account
    const { data: account, error } = await supabase
        .from('marketplace_accounts')
        .select('*')
        .eq('id', 8)
        .single();

    if (error) { console.error("DB Error:", error); return; }
    console.log(`Account: ${account.store_name} (Org: ${account.organization_id})`);

    // 2. Build URL (Logic from route.ts)
    let baseUrl = account.base_url || account.store_url || account.url || account.supplier_id;
    if (!baseUrl && account.store_name && (account.store_name.includes('.com') || account.store_name.includes('.net') || account.store_name.includes('http'))) {
        baseUrl = account.store_name;
    }
    if (baseUrl && !baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
    }
    baseUrl = baseUrl?.replace(/\/$/, "");

    console.log(`Base URL: ${baseUrl}`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startDateISO = startDate.toISOString();

    const url = `${baseUrl}/wp-json/wc/v3/orders?per_page=5&after=${startDateISO}&consumer_key=${account.api_key}&consumer_secret=${account.api_secret}`;
    console.log(`Fetching URL: ${url.replace(account.api_secret, '***')}`);

    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'OrtakBarkod/1.0' } });
        console.log(`Response Status: ${response.status}`);

        if (!response.ok) {
            const txt = await response.text();
            console.error(`Error Body: ${txt}`);
        } else {
            const data = await response.json();
            console.log(`Success! Fetched ${data.length} orders.`);
            if (data.length > 0) {
                console.log("First Order ID:", data[0].id);
                console.log("First Order Date:", data[0].date_created);
            }
        }
    } catch (e) {
        console.error("Fetch Exception:", e.message);
    }
}

debugWoo();
