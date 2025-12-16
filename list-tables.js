
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    console.log("Listing all tables...");
    // Using a hack to list tables via a known rpc or just failed query if rpc not available.
    // Actually, we can just query pg_catalog or information_schema if enabled, but RLS might block.
    // Let's try to query a known common table and inspect errors or use specific Supabase unrelated table query if possible.

    // Method 1: information_schema (often restricted)
    const { data, error } = await supabase.from('information_schema.tables').select('*').eq('table_schema', 'public');

    if (data) {
        console.log("Tables (Method 1):", data.map(t => t.table_name));
        return;
    }

    // Method 2: Guessing common names if Method 1 fails
    const candidates = [
        'orders', 'products', 'customers', 'suppliers', 'expenses', 'invoices',
        'production', 'recipes', 'stock_movements', 'production_orders', 'manufacturing_orders',
        'work_orders', 'users', 'organizations', 'profiles', 'accounts',
        'transactions'
    ];

    console.log("Method 1 failed/empty. Checking candidates...");
    for (const t of candidates) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error || error.code !== '42P01') {
            console.log(`Table exists: ${t}`);
        }
    }
}
listTables();
