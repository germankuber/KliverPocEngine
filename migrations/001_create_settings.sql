-- Create ai_settings table for multiple API configurations
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add setting_id to simulations table
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS setting_id UUID REFERENCES ai_settings(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_simulations_setting_id ON simulations(setting_id);

-- Drop old app_settings table if it exists (as we're replacing it with ai_settings)
-- Comment this out if you want to keep the old table
-- DROP TABLE IF EXISTS app_settings;



