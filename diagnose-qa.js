
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseQA() {
    console.log("--- DIAGNOSING Q&A TABLE ---");

    // 1. Count Total Questions
    const { count, error: countError } = await supabase
        .from('marketplace_questions')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Count Error:", countError);
        return;
    }
    console.log(`Total Questions in DB: ${count}`);

    // 2. Sample Data
    const { data: sample } = await supabase
        .from('marketplace_questions')
        .select('id, organization_id, text, store_id')
        .limit(20);

    console.log("Sample Rows:", sample);

    // 3. Check for Duplicate IDs across Organizations (if ID is not unique PK)
    // Actually, PK constraint prevents duplicate IDs. 
    // The issue might be that DIFFERENT questions got the SAME ID from Trendyol 
    // and thus one overwrote the other if we use Trendyol ID as PK.
    // My previous fix changed to Synthetic ID. 
    // Let's see if we have rows with 'raw_data->>id' collisions across orgs.

    const { data: allQuestions } = await supabase
        .from('marketplace_questions')
        .select('id, organization_id, raw_data');

    if (!allQuestions) {
        console.log("No questions found.");
        return;
    }

    const remoteIdMap = {};
    const collisions = [];

    allQuestions.forEach(q => {
        if (q.raw_data && q.raw_data.id) {
            const remoteID = q.raw_data.id;
            const key = `${remoteID}`; // Just remote ID

            if (!remoteIdMap[key]) {
                remoteIdMap[key] = [];
            }
            remoteIdMap[key].push({ dbId: q.id, org: q.organization_id });
        }
    });

    // Find if same remote ID exists for multiple organizations
    Object.keys(remoteIdMap).forEach(key => {
        const entries = remoteIdMap[key];
        const orgs = new Set(entries.map(e => e.org));
        if (orgs.size > 1) {
            collisions.push({ remoteId: key, entries });
        }
    });

    if (collisions.length > 0) {
        console.log(`!!! FOUND CROSS-TENANT REMOTE ID COLLISIONS: ${collisions.length} !!!`);
        console.log("Example:", JSON.stringify(collisions[0], null, 2));
        console.log("This means multiple tenants have the same Trendyol Question ID?");
        // Trendyol IDs should be globally unique, but maybe they are testing with same credentials 
        // OR the user created two accounts in our system for the SAME Trendyol store?
    } else {
        console.log("No Cross-Tenant Remote ID collisions found based on raw_data.");
    }

    // 4. Check for Organization ID consistency
    // Do we have questions with missing organization_id?
    const missingOrg = allQuestions.filter(q => !q.organization_id);
    if (missingOrg.length > 0) {
        console.log(`!!! FOUND ${missingOrg.length} QUESTIONS WITHOUT ORGANIZATION_ID !!!`);
    } else {
        console.log("All questions have organization_id.");
    }

}

diagnoseQA();
