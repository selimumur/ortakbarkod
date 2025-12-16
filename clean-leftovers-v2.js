
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanLeftovers() {
    console.log("--- CLEANING LEFTOVERS (UUID FIX) ---");

    const tables = ['financial_transactions', 'materials', 'production_orders', 'stock_movements', 'recipes', 'expenses'];

    for (const t of tables) {
        console.log(`Deleting from ${t}...`);
        // Use "not id is null" to match all rows regardless of type (int/uuid)
        const { error } = await supabase.from(t).delete().not('id', 'is', null);

        if (error) {
            if (error.code === '42P01') console.log(`  -> Table ${t} does not exist (OK).`);
            else console.error(`  -> ERROR: ${error.message}`);
        } else {
            console.log(`  -> Cleaned ${t}.`);
        }
    }
}

cleanLeftovers();
