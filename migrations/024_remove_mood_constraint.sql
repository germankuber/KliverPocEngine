-- Remove hardcoded mood constraint to allow dynamic moods from moods table
ALTER TABLE characters
DROP CONSTRAINT IF EXISTS valid_mood;

-- Update comment to reflect dynamic moods
COMMENT ON COLUMN characters.mood IS 'Character mood/attitude - references mood names from moods table';
