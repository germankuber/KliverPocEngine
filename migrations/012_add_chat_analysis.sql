-- Add analysis_result to chats table to store evaluator output
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS analysis_result JSONB;

ALTER TABLE chats
ADD COLUMN IF NOT EXISTS analysis_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN chats.analysis_result IS 'Evaluator JSON result for completed chat analysis';
COMMENT ON COLUMN chats.analysis_updated_at IS 'When analysis_result was last updated';

CREATE INDEX IF NOT EXISTS idx_chats_analysis_updated_at ON chats(analysis_updated_at);
