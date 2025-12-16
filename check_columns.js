
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

async function probe() {
    const candidates = ['password', 'sifre', 'pass', 'api_key', 'secret_key', 'secret', 'key', 'credentials', 'settings'];

    for (const col of candidates) {
        console.log(`Probing column: ${col}`);
        const payload = { provider: 'Probe' };
        payload[col] = 'testval';

        const { error } = await supabase.from('cargo_connections').insert([payload]);

        if (error) {
            console.log(`  Failed: ${error.message}`);
            if (error.message.includes('violates not-null constraint')) {
                console.log(`  Hit! Column '${col}' likely exists but we missed another required col.`);
            }
        } else {
            console.log(`  SUCCESS! Column '${col}' exists.`);
            await supabase.from('cargo_connections').delete().eq('provider', 'Probe');
            break;
        }
    }
}

probe();
