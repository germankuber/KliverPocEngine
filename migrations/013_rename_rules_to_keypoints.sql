-- Migration 013: Rename rules to keypoints and add character/player keypoints
-- Purpose: Change from single rules array to separate character_keypoints and player_keypoints

-- Step 1: Add new columns for character and player keypoints
ALTER TABLE simulations 
ADD COLUMN character_keypoints TEXT[] DEFAULT '{}',
ADD COLUMN player_keypoints TEXT[] DEFAULT '{}';

-- Step 2: Optionally migrate existing rules data to character_keypoints
-- (You can customize this based on your needs)
-- UPDATE simulations 
-- SET character_keypoints = ARRAY(
--   SELECT jsonb_array_elements_text(
--     (SELECT jsonb_agg(r->>'answer') FROM jsonb_array_elements(rules::jsonb) r)
--   )
-- )
-- WHERE rules IS NOT NULL AND jsonb_array_length(rules::jsonb) > 0;

-- Step 3: Drop the old rules column (commented out for safety)
-- You can uncomment this after confirming the migration is successful
-- ALTER TABLE simulations DROP COLUMN rules;

-- Note: For now, we keep both columns to allow for a gradual transition
-- Once you verify everything works, you can uncomment the DROP COLUMN statement
