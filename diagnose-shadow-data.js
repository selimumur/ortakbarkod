
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    console.log("--- DIAGNOSING SHADOW/ORPHAN DATA ---");

    // 1. Questions without valid Stores
    // Fetch all question store_ids and all account ids
    const { data: qData } = await supabase.from('marketplace_questions').select('id, store_id');
    const { data: aData } = await supabase.from('marketplace_accounts').select('id');

    const validStoreIds = new Set(aData.map(a => a.id));
    const orphanQuestions = qData.filter(q => !validStoreIds.has(q.store_id));

    console.log(`Orphan Questions (Deleted Stores): ${orphanQuestions.length}`);

    // 2. Product-Marketplace links without valid Master Products
    const { data: linkData } = await supabase.from('product_marketplaces').select('id, product_id');
    const { data: prodData } = await supabase.from('master_products').select('id');

    const validProdIds = new Set(prodData.map(p => p.id));
    const orphanLinks = linkData.filter(l => !validProdIds.has(l.product_id));

    console.log(`Orphan Product Links (Deleted Products): ${orphanLinks.length}`);

    // 3. Null Org ID Checks (Unrecoverable)
    // We already fixed accounts and questions. Let's check Products.
    const { count: ghostProducts } = await supabase.from('master_products').select('*', { count: 'exact', head: true }).is('organization_id', null);
    console.log(`Ghost Products (No Org ID): ${ghostProducts || 0}`);

    const { count: ghostOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('organization_id', null);
    console.log(`Ghost Orders (No Org ID): ${ghostOrders || 0}`);

    // 4. Return summary
    return { orphanQuestions, orphanLinks, ghostProducts, ghostOrders };
}

diagnose();
