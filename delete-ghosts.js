
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteGhosts() {
    console.log("Deleting ghost products (organization_id IS NULL)...");

    // We can't delete 5000+ at once easily, do it in chunks or loop until 0
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
        // Fetch a chunk of IDs to delete
        const { data, error } = await supabase
            .from('master_products')
            .select('id')
            .is('organization_id', null)
            .limit(100);

        if (error) {
            console.error("Error fetching ghosts:", error.message);
            break;
        }

        if (!data || data.length === 0) {
            hasMore = false;
            break;
        }

        const ids = data.map(d => d.id);
        const { error: delError } = await supabase
            .from('master_products')
            .delete()
            .in('id', ids);

        if (delError) {
            console.error("Error deleting chunk:", delError.message);
            // If FK constraint fails, we might be stuck.
            // Check if we need to delete related tables?
            // Assuming cascade works or no relations.
            break;
        }

        totalDeleted += ids.length;
        console.log(`Deleted ${totalDeleted} ghosts...`);
    }

    console.log("Cleanup complete.");
}

deleteGhosts();
