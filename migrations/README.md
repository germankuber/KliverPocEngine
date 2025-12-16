# Database Migrations

This folder contains SQL migrations for the KliverPoc database.

## How to Apply Migrations

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `001_create_settings.sql`
5. Paste into the editor and click **Run**

### Using Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

## Migration History

### 001_create_settings.sql

**Purpose:** Create the AI settings table and update simulations table

**Changes:**
- Creates `ai_settings` table for managing multiple API configurations
- Adds `setting_id` column to `simulations` table
- Creates index on `simulations.setting_id` for better performance
- Optionally drops the old `app_settings` table (commented out by default)

**What it does:**
- Allows users to create multiple AI settings (API keys + models)
- Each simulation can be assigned a specific AI setting
- Prevents deletion of settings that are in use by simulations

## Important Notes

⚠️ **Before Running Migrations:**

1. **Backup your data** - Always backup your database before running migrations
2. **Old app_settings table** - The migration includes a commented line to drop the old `app_settings` table. Uncomment this line ONLY if you're sure you don't need it anymore.
3. **Existing simulations** - After running the migration, existing simulations will have `setting_id = NULL`. You'll need to:
   - Create at least one AI setting in the new Settings page
   - Edit each existing simulation to assign it a setting

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove setting_id from simulations
ALTER TABLE simulations DROP COLUMN IF EXISTS setting_id;

-- Drop ai_settings table
DROP TABLE IF EXISTS ai_settings;

-- Optionally restore app_settings table if you backed it up
```

