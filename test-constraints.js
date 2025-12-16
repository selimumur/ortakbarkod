
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectIndexes() {
    // We can't easily query pg_indexes via supabase-js without an RPC.
    // Failing that, we can try to infer from behavior.

    // Testing if multiple orgs can have same code.
    const code = "TEST-CODE-" + Date.now();
    const org1 = "org1_" + Date.now();
    const org2 = "org2_" + Date.now();

    console.log("Testing duplicate code across organizations...");

    try {
        // Insert for org 1
        const { data: d1, error: e1 } = await supabase.from('master_products').insert({
            name: 'Test 1',
            code: code,
            organization_id: org1
        }).select();

        if (e1) {
            console.error("Insert 1 failed:", e1.message);
            return;
        }
        console.log("Insert 1 success (ID:", d1[0].id, ")");

        // Insert same code for org 2
        const { data: d2, error: e2 } = await supabase.from('master_products').insert({
            name: 'Test 2',
            code: code,
            organization_id: org2
        }).select();

        if (e2) {
            console.error("Insert 2 failed (Constraint is likely GLOBAL):", e2.message);
        } else {
            console.log("Insert 2 success (Constraint is likely SCOPED by Org or non-existent)");
            // Cleanup org 2
            await supabase.from('master_products').delete().eq('id', d2[0].id);
        }

        // Cleanup org 1
        await supabase.from('master_products').delete().eq('id', d1[0].id);

    } catch (err) {
        console.error("Exception:", err);
    }
}

inspectIndexes();
