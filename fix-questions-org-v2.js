
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    console.log("Starting FIX for Accounts and Questions...");

    // 1. Find a valid Organization ID from any account
    const { data: validAcc } = await supabase
        .from('marketplace_accounts')
        .select('organization_id')
        .not('organization_id', 'is', null)
        .limit(1)
        .single();

    if (!validAcc) {
        console.error("CRITICAL: No account has a valid organization_id! Cannot infer ownership.");
        // Fallback: If absolutely no account has org_id, we might need to ask user for their ID or insert a dummy one?
        // Actually, the user just ran the app and SAW one store. So one MUST exist.
        return;
    }

    const targetOrgId = validAcc.organization_id;
    console.log(`Using inferred Organization ID: ${targetOrgId}`);

    // 2. Update ORPHANED Accounts
    const { error: accUpdateErr, count: accCount } = await supabase
        .from('marketplace_accounts')
        .update({ organization_id: targetOrgId })
        .is('organization_id', null);

    if (accUpdateErr) console.error("Account Fix Error:", accUpdateErr);
    else console.log(`Fixed orphaned accounts.`);

    // 3. Update Questions (Now that accounts have IDs)
    // Re-fetch stores
    const { data: stores } = await supabase.from('marketplace_accounts').select('id, organization_id, store_name');

    for (const store of stores || []) {
        if (!store.organization_id) continue;

        const { error, count } = await supabase
            .from('marketplace_questions')
            .update({ organization_id: store.organization_id })
            .eq('store_id', store.id) // Use 'id' (pk) not 'store_id' unless column matches
            .is('organization_id', null);

        if (!error) console.log(`Fixed questions for ${store.store_name} (${store.id})`);
    }

    console.log("DONE. Accounts and Questions should be visible.");
}

fix();
