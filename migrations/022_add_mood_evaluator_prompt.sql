-- Add mood_evaluator_prompt column to global_prompts table
ALTER TABLE global_prompts 
ADD COLUMN IF NOT EXISTS mood_evaluator_prompt TEXT;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN global_prompts.mood_evaluator_prompt IS 'Prompt used to evaluate the mood and emotional state during conversations';
