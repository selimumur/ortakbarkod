
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
const supabase = createClient(url, key);

async function testDhl() {
    console.log("Testing dhl columns...");
    const { error } = await supabase.from('cargo_connections')
        .insert([{ provider: 'Probe', account_number: 'acc', api_key: 'key', secret_key: 'secret' }]);

    if (error) {
        console.log("Error:", error.message);
    } else {
        console.log("SUCCESS! Columns exist.");
        await supabase.from('cargo_connections').delete().eq('provider', 'Probe');
    }
}

testDhl();
