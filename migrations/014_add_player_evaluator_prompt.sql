-- Migration 014: Rename columns to match naming convention
-- Purpose: Rename evaluation_rule_prompt and player columns to keypoints_evaluation format

-- Rename evaluation_rule_prompt to character_keypoints_evaluation_prompt
ALTER TABLE global_prompts 
RENAME COLUMN evaluation_rule_prompt TO character_keypoints_evaluation_prompt;

-- Rename player_evaluator_prompt to player_keypoints_evaluation_prompt
ALTER TABLE global_prompts 
RENAME COLUMN player_evaluator_prompt TO player_keypoints_evaluation_prompt;

-- Drop player_analysis_prompt (not needed)
ALTER TABLE global_prompts 
DROP COLUMN IF EXISTS player_analysis_prompt;

-- Update default value for player_keypoints_evaluation_prompt if empty
UPDATE global_prompts 
SET player_keypoints_evaluation_prompt = 'Evaluate if the player mentioned the required keypoints during the conversation.'
WHERE player_keypoints_evaluation_prompt = '';

-- Add comments to the columns
COMMENT ON COLUMN global_prompts.character_keypoints_evaluation_prompt IS 'Evaluation criteria for character keypoints during conversation';
COMMENT ON COLUMN global_prompts.character_analysis_prompt IS 'Additional analysis criteria for character responses';
COMMENT ON COLUMN global_prompts.player_keypoints_evaluation_prompt IS 'Evaluation criteria for player keypoints during conversation';
