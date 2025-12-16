
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function list() {
    // Attempt to just fetch * from a guaranteed table to ensure connection, then try to list via error message or inspection
    console.log("Connect...");
    const { error } = await supabase.from('nonexistent_table_to_force_error').select('*');
    if (error) console.log(error.message); // Sometimes leaks valid tables in hint

    // Direct check of known candidates again, but print simpler
    const tables = ['orders', 'customers', 'suppliers', 'products', 'recipes', 'production_orders', 'productions', 'machines', 'employees', 'expenses'];
    for (const t of tables) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`EXISTS: ${t}`);
        else if (error.code !== '42P01') console.log(`EXISTS: ${t} (but query error: ${error.message})`);
        else console.log(`MISSING: ${t}`);
    }
}
list();
