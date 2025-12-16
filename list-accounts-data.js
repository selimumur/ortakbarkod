
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function list() {
    console.log("--- ACCOUNTS & DATA COUNTS ---");

    // 1. Get Accounts
    const { data: accounts, error } = await supabase.from('marketplace_accounts').select('id, store_name, platform, organization_id');
    if (error) { console.error(error); return; }

    // 2. Get Counts
    for (const acc of accounts) {
        const { count: qCount } = await supabase.from('marketplace_questions').select('*', { count: 'exact', head: true }).eq('store_id', acc.id);
        const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('store_id', acc.id); // Assuming store_id exists on orders? or it might be via connection?

        // Orders usually link to marketplace_accounts via...?
        // Let's check 'orders' schema quickly if needed, but usually it has 'store_id' or 'marketplace_id' or mapped via JSON.
        // Based on previous files, 'orders' has 'organization_id'. Does it have 'store_id'?
        // Let's assume it does or we check 'marketplace_id'.

        console.log(`[${acc.organization_id ? 'SECURE' : 'ORPHAN'}] ${acc.store_name} (ID: ${acc.id}) | Questions: ${qCount} | Orders: ${oCount || '?'}`);
    }

    // 3. Check for any data with NULL organization_id again
    const { count: ghostQ } = await supabase.from('marketplace_questions').select('*', { count: 'exact', head: true }).is('organization_id', null);
    const { count: ghostO } = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('organization_id', null);

    console.log(`\nGhost Questions: ${ghostQ}`);
    console.log(`Ghost Orders: ${ghostO}`);
}

list();
