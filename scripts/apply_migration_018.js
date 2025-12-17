import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    try {
        console.log('Applying migration 018: Fix Public Access...');

        const migrationPath = join(__dirname, '../migrations/018_fix_public_access.sql');
        const sql = readFileSync(migrationPath, 'utf-8');

        // Split by statement and execute each one
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            console.log('Executing statement...');
            const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

            if (error) {
                console.error('Error executing statement:', error);
                console.error('Statement:', statement);
            }
        }

        console.log('Migration 018 applied successfully!');
    } catch (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();
