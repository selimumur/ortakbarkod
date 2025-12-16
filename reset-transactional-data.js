
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function reset() {
    console.log("!!! WARNING: DELETING TRANSACTIONAL DATA !!!");
    console.log("Target Tables: orders, marketplace_questions, product_marketplaces");

    // 1. Delete Orders
    const { error: oErr, count: oCount } = await supabase.from('orders').delete().neq('id', 0); // Delete all
    if (oErr) console.error("Orders Delete Error:", oErr);
    else console.log("Orders deleted.");

    // 2. Delete Questions
    const { error: qErr, count: qCount } = await supabase.from('marketplace_questions').delete().neq('id', 0);
    if (qErr) console.error("Questions Delete Error:", qErr);
    else console.log("Questions deleted.");

    // 3. Delete Product Links (Integrations)
    // We keep master_products (Local definitions) but remove links to remote
    const { error: lErr, count: lCount } = await supabase.from('product_marketplaces').delete().neq('id', 0);
    if (lErr) console.error("Product Links Delete Error:", lErr);
    else console.log("Product Marketplaces deleted.");

    console.log("--- WIPE COMPLETE ---");
    console.log("Ready for fresh sync.");
}

reset();
