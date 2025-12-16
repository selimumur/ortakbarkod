
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking Tables...");

    // 1. Questions
    const { count: qCount, error: qError } = await supabase
        .from('marketplace_questions')
        .select('*', { count: 'exact', head: true });

    if (qError) console.error("marketplace_questions Error:", qError.message);
    else console.log("marketplace_questions Count:", qCount);

    // 2. Reviews & Ads
    const tableNames = [
        'marketplace_reviews',
        'marketplace_ads',
        'ads',
        'campaigns',
        'marketplace_campaigns'
    ];

    // 3. Inspect Columns
    const { data: ads, error: adsError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (adsError) console.error("Orders Error:", adsError.message);
    else if (ads && ads.length > 0) {
        console.log("Orders Schema Keys:", Object.keys(ads[0]));
        console.log("Sample Order:", ads[0]);
    } else {
        console.log("Orders table exists but is empty.");
    }
}

checkTables();
