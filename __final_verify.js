
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Final verification...");
    // Just check if we can select from master_products without error
    const { data, error } = await supabase.from('master_products').select('id, organization_id').limit(1);
    if (error) {
        console.error("Verification failed:", error.message);
    } else {
        console.log("Verification success. Data sample:", data);
    }
}
verify();
