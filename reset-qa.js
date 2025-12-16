
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetQA() {
    console.log("--- RESETTING Q&A TABLE ---");

    // Delete All Rows
    const { error, count } = await supabase
        .from('marketplace_questions')
        .delete()
        .neq('id', 0); // Delete all where ID is not 0 (effectively all)

    if (error) {
        console.error("Delete Error:", error);
    } else {
        console.log("Successfully deleted all questions.");
        console.log("Users must re-sync to get clean, isolated data.");
    }
}

resetQA();
