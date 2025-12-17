-- Create global_prompts table for system-wide prompts
CREATE TABLE IF NOT EXISTS global_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant.',
  evaluation_rule_prompt TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default prompts
INSERT INTO global_prompts (system_prompt, evaluation_rule_prompt)
VALUES (
  'You are a helpful assistant.',
  'Evaluate if the response follows the defined rules and answers the user appropriately.'
);

-- Add comment to the table
COMMENT ON TABLE global_prompts IS 'Global system prompts used across all simulations';
COMMENT ON COLUMN global_prompts.system_prompt IS 'Core instructions that define how the AI should behave';
COMMENT ON COLUMN global_prompts.evaluation_rule_prompt IS 'Rules and criteria for evaluating AI performance';

-- Remove system_prompt and evaluation_rule_prompt from simulations table
ALTER TABLE simulations DROP COLUMN IF EXISTS system_prompt;
ALTER TABLE simulations DROP COLUMN IF EXISTS evaluation_rule_prompt;



