
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fullWipe() {
    console.log("!!! INITIATING FULL SYSTEM WIPE !!!");

    // List of tables to truncate (Delete All)
    // Ordered by dependency if foreign keys exist (child first)
    const tables = [
        'marketplace_questions',
        'product_marketplaces',
        'financial_transactions',
        'invoices',
        'work_orders',
        'production_orders',
        'stock_movements',
        'orders', // Depends on customers?
        'customers',
        'suppliers',
        'financial_accounts', // Bank/Safe
        // 'materials', // If user said raw materials
        // 'employees', 'personnel', // Depends on naming, let's try common
        'marketplace_accounts',
        'master_products'
    ];

    for (const t of tables) {
        console.log(`Deleting ${t}...`);
        const { error, count } = await supabase.from(t).delete().neq('id', 0); // Delete All

        if (error) {
            if (error.code === '42P01') console.log(`  -> Table ${t} does not exist (Skipped)`);
            else console.error(`  -> ERROR deleting ${t}: ${error.message}`);
        } else {
            console.log(`  -> Deleted from ${t}.`);
        }
    }

    console.log("--- WIPE COMPLETE ---");
    console.log("System should be empty (except auth/users).");
}

fullWipe();
