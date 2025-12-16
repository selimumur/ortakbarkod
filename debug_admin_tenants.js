
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDiscovery() {
    console.log("--- DEBUGGING TENANT DISCOVERY ---");

    // 1. Subscriptions
    const { data: subs, error: subError } = await supabase.from('saas_subscriptions').select('tenant_id');
    if (subError) console.error("Sub Error:", subError);
    console.log(`Subscriptions Found: ${subs?.length || 0}`);
    if (subs && subs.length > 0) console.log("Sub IDs:", subs.map(s => s.tenant_id));

    // 2. Products
    const { data: products } = await supabase.from('products').select('organization_id').not('organization_id', 'is', null);
    const productOrgs = new Set(products?.map(p => p.organization_id));
    console.log(`Product Orgs Found: ${productOrgs.size}`);
    console.log("Product Orgs:", [...productOrgs]);

    // 3. Customers
    const { data: customers } = await supabase.from('customers').select('organization_id').not('organization_id', 'is', null);
    const customerOrgs = new Set(customers?.map(c => c.organization_id));
    console.log(`Customer Orgs Found: ${customerOrgs.size}`);
    console.log("Customer Orgs:", [...customerOrgs]);

    // 4. Combined
    const allDetected = new Set([...productOrgs, ...customerOrgs]);
    console.log(`Total Unique Detected Orgs: ${allDetected.size}`);
    console.log("All Detected:", [...allDetected]);

    const subscribing = new Set(subs?.map(s => s.tenant_id) || []);
    const missing = [...allDetected].filter(x => !subscribing.has(x));

    console.log(`MISSING from Subscriptions (Should be 'Detected'): ${missing.length}`);
    console.log("Missing IDs:", missing);
}

debugDiscovery();
