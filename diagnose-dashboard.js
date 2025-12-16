
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- Dashboard Diagnosis ---");
    console.log(`System Time: ${new Date().toISOString()}`);

    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    console.log(`Total Orders: ${totalOrders}`);

    // Fetch recent orders to see dates
    const { data: recentOrders } = await supabase
        .from('orders')
        .select('order_date, organization_id, status, total_price')
        .order('order_date', { ascending: false })
        .limit(5);

    if (recentOrders && recentOrders.length > 0) {
        console.log("Most Recent Order Date:", recentOrders[0].order_date);
        console.log("Oldest of Top 5:", recentOrders[recentOrders.length - 1].order_date);
        console.log("Sample Org:", recentOrders[0].organization_id);

        const sampleOrg = recentOrders[0].organization_id;

        const now = new Date();
        // Start of current month (System Time)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOf2024 = '2024-01-01T00:00:00.000Z';

        const { count: monthCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', sampleOrg).gte('order_date', startOfMonth);
        const { count: all2024 } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', sampleOrg).gte('order_date', startOf2024);

        console.log(`Orders since ${startOfMonth} (This Month - System Time): ${monthCount}`);
        console.log(`Orders since ${startOf2024} (Since 2024-01-01): ${all2024}`);
    } else {
        console.log("No orders found in table!");
    }
}

diagnose();
