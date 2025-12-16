
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable(table) {
    console.log(`Inspecting ${table} columns...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
        console.error(`Error ${table}:`, error.message);
    } else if (data && data.length > 0) {
        console.log(`${table} Columns:`, Object.keys(data[0]));
        // console.log(`${table} Data Sample:`, JSON.stringify(data[0], null, 2));
    } else {
        console.log(`${table} is empty.`);
    }
}

async function run() {
    await inspectTable('cargo_connections');
}

run();
