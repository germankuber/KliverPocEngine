-- Add user_identifier and path_id to chats table for path tracking
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS user_identifier TEXT,
ADD COLUMN IF NOT EXISTS path_id UUID REFERENCES paths(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_user_identifier ON chats(user_identifier);
CREATE INDEX IF NOT EXISTS idx_chats_path_id ON chats(path_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_path ON chats(user_identifier, path_id);
