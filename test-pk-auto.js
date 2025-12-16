
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoIncrement() {
    console.log("Testing Auto Increment on marketplace_questions...");

    // Try to insert WITHOUT an ID. 
    // If 'id' is SERIAL/IDENTITY, it will work and return a new ID.
    // If not, it will fail (null constraint or similar).

    const { data, error } = await supabase.from('marketplace_questions').insert({
        text: 'Auto ID Test',
        customer_name: 'Tester',
        product_name: 'P1',
        status: 'WAITING',
        created_date: new Date().toISOString(),
        store_id: 0,
        organization_id: 'test_org_seq' // Mock
    }).select();

    if (error) {
        console.log("Insert Error:", error.message);
    } else {
        console.log("Insert Success! New ID:", data[0].id);

        // Clean up
        await supabase.from('marketplace_questions').delete().eq('id', data[0].id);
    }
}

testAutoIncrement();
