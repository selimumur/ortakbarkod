
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    const { data } = await supabase.from('orders').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("COLUMNS:", Object.keys(data[0]));
    } else {
        console.log("No data found to inspect columns");
    }
}
checkCols();
