
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Verifying database connection...");
    // Attempt to select one row from master_products to check if user_id column exists
    const { data, error } = await supabase.from('master_products').select('user_id').limit(1);

    if (error) {
        console.error("Error connecting or querying master_products:", error.message);
        console.error(error);
    } else {
        console.log("Success! master_products table accessible.");
        console.log("Data sample:", data);
    }
}

verify();
