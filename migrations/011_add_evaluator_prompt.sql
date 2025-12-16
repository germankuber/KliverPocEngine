-- Add evaluator_prompt column to global_prompts
ALTER TABLE global_prompts
ADD COLUMN IF NOT EXISTS evaluator_prompt TEXT DEFAULT '';

COMMENT ON COLUMN global_prompts.evaluator_prompt IS 'Additional evaluation criteria and instructions for the AI evaluator';

-- Update existing row if exists
UPDATE global_prompts 
SET evaluator_prompt = '' 
WHERE evaluator_prompt IS NULL;
