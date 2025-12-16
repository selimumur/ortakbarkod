
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf8');
            const env = {};
            envFile.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim().replace(/"/g, '');
                    env[key] = val;
                }
            });
            return env;
        }
    } catch (e) { }
    return process.env;
}

const env = getEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.log("Env vars not found.");
    process.exit(0);
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('master_products').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("MASTER_PRODUCTS_KEYS:", Object.keys(data[0]).join(','));
    } else {
        if (error) console.log("Error:", error.message);
        else console.log("Table empty");
    }

    const { data: pm } = await supabase.from('product_marketplaces').select('*').limit(1);
    if (pm && pm.length > 0) {
        console.log("PRODUCT_MARKETPLACES_KEYS:", Object.keys(pm[0]).join(','));
    }

    const { data: cc, error: ccError } = await supabase.from('cargo_connections').select('*').limit(1);
    if (ccError) console.log("CC Error:", ccError.message);
    else if (cc && cc.length > 0) console.log("CARGO_CONNECTIONS_KEYS:", Object.keys(cc[0]).join(','));
    else console.log("CARGO_CONNECTIONS empty.");

    const { data: ord, error: ordError } = await supabase.from('orders').select('*').limit(1);
    if (ordError) console.log("Orders Error:", ordError.message);
    else if (ord && ord.length > 0) {
        console.log("ORDERS_KEYS:", Object.keys(ord[0]).join(','));
        console.log("SAMPLE_ORDER:", JSON.stringify(ord[0], null, 2));
    }
    else console.log("Orders table empty.");
}

check();
