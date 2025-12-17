import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '019_add_description_to_simulations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️  RPC method not available, applying migration directly...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        const { error: execError } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (execError) {
          console.error('❌ Error executing statement:', execError);
          throw execError;
        }
      }
    }

    console.log('✅ Migration 019 applied successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - Added "description" column to simulations table');
    console.log('   - This field will be shown at the start of chat instead of context and objective');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('💡 Manual fix: Run the following SQL in Supabase SQL Editor:');
    console.log('');
    const migrationPath = path.join(__dirname, '..', 'migrations', '019_add_description_to_simulations.sql');
    console.log(fs.readFileSync(migrationPath, 'utf-8'));
    process.exit(1);
  }
}

applyMigration();
