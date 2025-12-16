
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking master_products schema...");
    const { data: products, error } = await supabase.from('master_products').select('*').limit(1);
    if (error) console.error("Error fetching master_products:", error);
    else if (products && products.length > 0) {
        console.log('Master Products Keys:', Object.keys(products[0]));
    } else {
        console.log('Master Products table is empty, cannot infer keys.');
    }

    console.log("\nChecking product_marketplaces schema...");
    const { data: pm, error: pmError } = await supabase.from('product_marketplaces').select('*').limit(1);
    if (pmError) console.error("Error fetching product_marketplaces:", pmError);
    else if (pm && pm.length > 0) {
        console.log('Product Marketplaces Keys:', Object.keys(pm[0]));
    }

    console.log("\nChecking cargo_connections schema...");
    const { data: cc, error: ccError } = await supabase.from('cargo_connections').select('*').limit(1);
    if (ccError) console.error("Error fetching cargo_connections:", ccError);
    else if (cc && cc.length > 0) {
        console.log('Cargo Connections Keys:', Object.keys(cc[0]));
    } else {
        console.log('Cargo Connections table exists but empty.');
    }
}

checkSchema();
