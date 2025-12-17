-- Add evaluation_rule_prompt column to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS evaluation_rule_prompt TEXT;

-- Add comment to the column
COMMENT ON COLUMN simulations.evaluation_rule_prompt IS 'Rules and criteria for evaluating the AI performance and responses';



