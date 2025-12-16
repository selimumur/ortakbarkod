
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

async function testJson() {
    console.log("Testing is_active...");
    const { error: err1 } = await supabase.from('cargo_connections')
        .insert([{ provider: 'Probe', is_active: true }]);

    if (err1) console.log("is_active Error:", err1.message);
    else {
        console.log("is_active SUCCESS.");
        await supabase.from('cargo_connections').delete().eq('provider', 'Probe');
    }

    console.log("Testing settings column...");
    const { error: err2 } = await supabase.from('cargo_connections')
        .insert([{ provider: 'Probe', settings: { a: 1 } }]);

    if (err2) console.log("settings Error:", err2.message);
    else {
        console.log("settings SUCCESS.");
        await supabase.from('cargo_connections').delete().eq('provider', 'Probe');
    }
}

testJson();
