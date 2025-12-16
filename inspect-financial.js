
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    console.log("Inspecting 'accounts'...");
    const { data: accounts, error: err1 } = await supabase.from('accounts').select('*').limit(1);
    if (err1) console.log("accounts error:", err1.message);
    else console.log("accounts keys:", Object.keys(accounts[0] || {}));

    console.log("\nInspecting 'transactions'...");
    const { data: trans, error: err2 } = await supabase.from('transactions').select('*').limit(1);
    if (err2) console.log("transactions error:", err2.message);
    else console.log("transactions keys:", Object.keys(trans[0] || {}));

    console.log("\nInspecting 'financial_accounts' again...");
    const { error: err3 } = await supabase.from('financial_accounts').select('*').limit(1);
    if (err3) console.log("financial_accounts error:", err3.message);
}
inspect();
