
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking marketplace_questions schema...");

    // We can't easily DESCRIBE table via JS client, but we can test duplicates.
    // 1. Check if we can insert two rows with same ID

    const randomId = Math.floor(Math.random() * 1000000);

    console.log(`Testing ID collision with ID: ${randomId}`);

    // Insert 1
    const { error: e1 } = await supabase.from('marketplace_questions').insert({
        id: randomId,
        text: 'Test 1',
        customer_name: 'Tester',
        product_name: 'P1',
        status: 'WAITING',
        created_date: new Date().toISOString(),
        store_id: 0, // Mock
        organization_id: 'org_1'
    });

    if (e1) console.log("Insert 1 Error:", e1.message);
    else console.log("Insert 1 Success");

    // Insert 2 (Same ID, diff org)
    const { error: e2 } = await supabase.from('marketplace_questions').insert({
        id: randomId,
        text: 'Test 2',
        customer_name: 'Tester',
        product_name: 'P1',
        status: 'WAITING',
        created_date: new Date().toISOString(),
        store_id: 0,
        organization_id: 'org_2'
    });

    if (e2) {
        console.log("Insert 2 Error (Constraint works?):", e2.message);
    } else {
        console.log("Insert 2 Success (DUPLICATES ALLOWED!)");

        // Clean up
        await supabase.from('marketplace_questions').delete().eq('id', randomId);
    }

    // Check actual data for duplicates
    // Fetch all questions and group by ID
    // Limit to check
    const { data } = await supabase.from('marketplace_questions').select('id, organization_id, text, status').limit(500);

    const map = {};
    const duplicates = [];
    data.forEach(q => {
        if (map[q.id]) {
            duplicates.push({ id: q.id, orgs: [map[q.id].organization_id, q.organization_id] });
        }
        map[q.id] = q;
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} Real Duplicates! Examples:`);
        console.log(JSON.stringify(duplicates.slice(0, 3), null, 2));
    } else {
        console.log("No duplicates found in sample.");
    }

}

checkSchema();
