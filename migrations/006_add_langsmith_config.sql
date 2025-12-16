-- Add LangSmith configuration to global_prompts table
ALTER TABLE global_prompts
ADD COLUMN IF NOT EXISTS langsmith_api_key TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS langsmith_project TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS langsmith_enabled BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN global_prompts.langsmith_api_key IS 'LangSmith API key for tracing and monitoring';
COMMENT ON COLUMN global_prompts.langsmith_project IS 'LangSmith project name';
COMMENT ON COLUMN global_prompts.langsmith_enabled IS 'Enable/disable LangSmith tracing';

