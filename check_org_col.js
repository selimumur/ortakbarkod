const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking organization_id on orders...");
    const { data, error } = await supabase.from('orders').select('organization_id').limit(1);

    if (error) {
        if (error.code === '42703') { // Undefined column
            console.log("RESULT: MISSING");
        } else {
            console.log("RESULT: ERROR", error.message);
        }
    } else {
        console.log("RESULT: EXISTS");
    }
}
check();
