# Apply Characters Migration

Please apply the following SQL in your Supabase Dashboard to enable reusable Characters:

1. Go to: https://supabase.com/dashboard/project/qzrmtljqhvqsukrtlxrm/sql/new
2. Copy and paste the SQL below
3. Click "Run"

## SQL Migration

```sql
-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add character_id to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_simulations_character_id ON simulations(character_id);

-- Add comments
COMMENT ON TABLE characters IS 'Reusable character profiles for simulations';
COMMENT ON COLUMN characters.name IS 'Character name or title';
COMMENT ON COLUMN characters.description IS 'Detailed character description and persona';
COMMENT ON COLUMN simulations.character_id IS 'Reference to a reusable character profile';
```

## What This Creates

1. **characters** - Stores reusable character profiles (name + description)
2. **character_id** - Foreign key in simulations linking to characters

## Benefits

- **Reusability**: Create character profiles once, use in multiple simulations
- **Consistency**: Same character behavior across different scenarios
- **Easy Updates**: Change character once, affects all simulations using it
- **Better Organization**: Centralized character management

## After Migration

Once applied, you can:
- Go to `/characters` to create character profiles
- In simulations, select a character from dropdown instead of typing
- Characters are automatically loaded in chat sessions
- Legacy `character` text field is still supported for backward compatibility

