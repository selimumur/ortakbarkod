
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
    console.log("--- CLEANING GHOST ORDERS ---");

    // Delete orders where organization_id IS NULL
    const { error, count, data } = await supabase
        .from('orders')
        .delete()
        .is('organization_id', null); // Safety filter

    if (error) console.error("Error deleting:", error.message);
    else console.log(`Deleted ghost orders.`); // Count might not return unless select used

    // Verify
    const { count: remaining } = await supabase.from('orders').select('*', { count: 'exact', head: true }).is('organization_id', null);
    console.log(`Remaining Ghost Orders: ${remaining}`);
}

clean();
