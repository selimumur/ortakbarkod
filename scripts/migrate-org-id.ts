
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials missing in .env');
    process.exit(1);
}

// Use Service Role Key if available for bypass RLS, otherwise Anon (might fail if RLS is strict)
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');
    const tables = [
        'marketplace_connections',
        'marketplace_accounts',
        'master_products',
        'orders',
        'marketplace_orders',
        'cargo_connections',
        'marketplace_questions',
        'marketplace_reviews'
    ];

    for (const table of tables) {
        console.log(`Checking table: ${table}...`);

        // Find records to fix
        const { data: records, error: fetchError } = await supabase
            .from(table)
            .select('id, user_id')
            .is('organization_id', null)
            .not('user_id', 'is', null)
            .limit(1000);

        if (fetchError) {
            console.error(`Error fetching ${table}:`, fetchError.message);
            continue;
        }

        if (!records || records.length === 0) {
            console.log(`  No records to fix in ${table}.`);
            continue;
        }

        console.log(`  Found ${records.length} records to fix in ${table}. Updating...`);

        let successCount = 0;
        for (const record of records) {
            const { error: updateError } = await supabase
                .from(table)
                .update({ organization_id: record.user_id })
                .eq('id', record.id);

            if (updateError) {
                console.error(`  Failed to update record ${record.id}: ${updateError.message}`);
            } else {
                successCount++;
            }
        }
        console.log(`  Updated ${successCount} records.`);
    }
    console.log('Migration complete.');
}

migrate();
