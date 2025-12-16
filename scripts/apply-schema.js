const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applySchema() {
    // Construct connection string from env vars if generic URL not present
    // Supabase usually provides DATABASE_URL (Transaction or Session pooler)
    // We prefer Direct URL for DDL changes if available? NEXT_PUBLIC_SUPABASE_URL is HTTP.
    // We need the postgres connection string.
    // Usually it is DATABASE_URL in .env.

    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        // Fallback: Try to construct it? or check valid vars.
        // Usually Supabase projects have POSTGRES_URL etc.
        // Let's assume DATABASE_URL is present as standard for Prisma/Drizzle/etc. if used.
        // If not, we might fail.
        console.error("DATABASE_URL not found in .env.local");

        // Try to read other vars
        if (process.env.POSTGRES_URL) connectionString = process.env.POSTGRES_URL;
    }

    if (!connectionString) {
        console.error("No connection string found. Please set DATABASE_URL.");
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase sometimes
    });

    try {
        await client.connect();
        console.log("Connected to database.");

        const sqlPath = path.join(__dirname, '../schema/update_multitenancy.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL...");
        await client.query(sql);
        console.log("Schema updated successfully.");

    } catch (err) {
        console.error("Error executing schema:", err);
    } finally {
        await client.end();
    }
}

applySchema();
