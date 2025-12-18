-- Add mood and intensity fields to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'cooperative',
ADD COLUMN IF NOT EXISTS intensity INTEGER DEFAULT 50;

-- Add check constraint for intensity range
ALTER TABLE characters
ADD CONSTRAINT intensity_range CHECK (intensity >= 30 AND intensity <= 100);

-- Add check constraint for valid mood values
ALTER TABLE characters
ADD CONSTRAINT valid_mood CHECK (mood IN ('cooperative', 'angry'));

-- Add comments
COMMENT ON COLUMN characters.mood IS 'Character mood/attitude: cooperative or angry';
COMMENT ON COLUMN characters.intensity IS 'Intensity level from 30 to 100';
