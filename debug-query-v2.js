
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugQuery() {
    console.log("--- DEBUGGING NESTED QUERY ---");

    // 1. Try Simple Select on Master Products
    const { data: pData, error: pError } = await supabase.from('master_products').select('id, name').limit(1);
    if (pError) console.error("Master Product Error:", pError);
    else console.log("Master Products Accessible. Count:", pData.length);

    // 2. Try the Nested Query
    const { data, error } = await supabase
        .from('master_products')
        .select(`
            id, name,
            product_marketplaces (
                id, marketplace_id,
                marketplace_accounts ( store_name )
            )
        `)
        .limit(1);

    if (error) {
        console.error("NESTED QUERY ERROR:", error);
        console.log("Hint: Check Foreign Keys.");
    } else {
        console.log("Nested Query Success!");
        console.dir(data, { depth: null });
    }
}

debugQuery();
