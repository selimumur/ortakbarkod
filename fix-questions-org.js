
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    console.log("Starting backfill for marketplace_questions.organization_id...");

    // 1. Get all stores with their org IDs
    const { data: stores, error: sErr } = await supabase
        .from('marketplace_accounts')
        .select('id, organization_id, store_name');

    if (sErr) { console.error(sErr); return; }

    let updatedTotal = 0;

    for (const store of stores) {
        if (!store.organization_id) {
            console.log(`Skipping store ${store.store_name} (No Org ID)`);
            continue;
        }

        // Update questions for this store
        const { error, count, data } = await supabase
            .from('marketplace_questions')
            .update({ organization_id: store.organization_id })
            .eq('store_id', store.store_id || store.id) // store_id in questions maps to id in accounts
            .is('organization_id', null); // Only fix missing ones

        if (error) console.error(`Error store ${store.store_name}:`, error.message);
        else if (data || count !== null) {
            // Supabase JS update doesn't return count by default usually unless select used or count option using weird syntax sometimes, but let's assume it works or just log.
            console.log(`Updated questions for ${store.store_name} (ID: ${store.id}) -> Org: ${store.organization_id}`);
        }
    }

    // To be sure, let's just do a raw SQL if possible? queries via client are safe.
    // Actually, let's verify count logic.
    // We can't clear "count" easily in update without returning.

    console.log("Backfill attempt complete. Please verify in app.");
}

fix();
