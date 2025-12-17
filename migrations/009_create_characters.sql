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



