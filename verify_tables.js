
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", supabaseUrl ? "Found" : "Missing");
console.log("KEY:", supabaseKey ? "Found" : "Missing");

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
    console.log("--- LISTING TABLES ---");
    // This query might need adjustment depending on permissions, but listing tables usually requires SQL or pg_catalog access which generic client might not have easily without RCP calls.
    // Instead we will just try to select count from known tables.

    const tables = ['products', 'customers', 'orders', 'profiles', 'users'];

    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table '${t}': Error - ${error.message}`);
        } else {
            console.log(`Table '${t}': ${count} rows`);
        }
    }
}

verifyTables();
