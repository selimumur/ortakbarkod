
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOrders() {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Order Columns:", Object.keys(data[0] || {}));
        console.log("Sample Row:", data[0]);
    }
}

inspectOrders();
