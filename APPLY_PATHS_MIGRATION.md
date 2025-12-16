# Apply Paths Migration

Please apply the following SQL in your Supabase Dashboard to enable the Paths feature:

1. Go to: https://supabase.com/dashboard/project/qzrmtljqhvqsukrtlxrm/sql/new
2. Copy and paste the SQL below
3. Click "Run"

## SQL Migration

```sql
-- Create paths table
CREATE TABLE IF NOT EXISTS paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create path_simulations junction table
CREATE TABLE IF NOT EXISTS path_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    max_attempts INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(path_id, simulation_id)
);

-- Create path_progress table to track user progress
CREATE TABLE IF NOT EXISTS path_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    user_identifier TEXT NOT NULL,
    attempts_used INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(path_id, simulation_id, user_identifier)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_path_simulations_path_id ON path_simulations(path_id);
CREATE INDEX IF NOT EXISTS idx_path_simulations_order ON path_simulations(path_id, order_index);
CREATE INDEX IF NOT EXISTS idx_path_progress_path_user ON path_progress(path_id, user_identifier);

-- Add comments
COMMENT ON TABLE paths IS 'Learning paths that group multiple simulations';
COMMENT ON TABLE path_simulations IS 'Junction table linking paths to simulations with configuration';
COMMENT ON TABLE path_progress IS 'Tracks user progress through paths';
COMMENT ON COLUMN path_simulations.max_attempts IS 'Maximum number of times a simulation can be attempted in this path';
COMMENT ON COLUMN path_progress.user_identifier IS 'Identifier for the user (email, session ID, or other)';
```

## What This Creates

1. **paths** - Stores learning path information
2. **path_simulations** - Links simulations to paths with order and attempt limits
3. **path_progress** - Tracks user progress through each path

## After Migration

Once applied, you can:
- Create paths at `/paths`
- Share public paths via `/play/{pathId}`
- Track user progress automatically
