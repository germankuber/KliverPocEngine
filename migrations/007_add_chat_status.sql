-- Add status field to chats table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_status') THEN
    CREATE TYPE chat_status AS ENUM ('active', 'completed', 'failed');
  END IF;
END $$;

ALTER TABLE chats
ADD COLUMN IF NOT EXISTS status chat_status DEFAULT 'active';

-- Add comment
COMMENT ON COLUMN chats.status IS 'Chat status: active (in progress), completed (all rules matched), failed (max interactions reached without completing)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);

