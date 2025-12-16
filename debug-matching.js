
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugMatching() {
    console.log("--- DEBUGGING MATCHING QUERY ---");

    // Replicating the query from getMatchingProductsAction
    const { data, error } = await supabase
        .from('master_products')
        .select(`
            id, name, code, barcode,
            product_marketplaces (
                id, marketplace, remote_product_id, marketplace_id
            )
        `);

    if (error) {
        console.error("QUERY ERROR:", error);
    } else {
        console.log("Query Success!");
        console.log(`Returned ${data.length} products.`);
    }
}

debugMatching();
