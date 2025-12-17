-- Migration 016: Add Multi-User Support
-- Purpose: Enable multiple users to use the system independently
-- Settings and global prompts remain shared, but simulations, paths, and characters are user-specific

-- Add user_id column to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to paths table
ALTER TABLE paths
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simulations_user_id ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_paths_user_id ON paths(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);

-- Add comments
COMMENT ON COLUMN simulations.user_id IS 'Reference to the user who owns this simulation';
COMMENT ON COLUMN paths.user_id IS 'Reference to the user who owns this path';
COMMENT ON COLUMN characters.user_id IS 'Reference to the user who owns this character';

-- Enable Row Level Security (RLS) on tables
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simulations
-- Users can only see their own simulations
CREATE POLICY simulations_select_policy ON simulations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert simulations for themselves
CREATE POLICY simulations_insert_policy ON simulations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own simulations
CREATE POLICY simulations_update_policy ON simulations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own simulations
CREATE POLICY simulations_delete_policy ON simulations
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for paths
-- Users can select their own paths OR public paths
CREATE POLICY paths_select_policy ON paths
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Users can only insert paths for themselves
CREATE POLICY paths_insert_policy ON paths
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own paths
CREATE POLICY paths_update_policy ON paths
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own paths
CREATE POLICY paths_delete_policy ON paths
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for characters
-- Users can only see their own characters
CREATE POLICY characters_select_policy ON characters
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert characters for themselves
CREATE POLICY characters_insert_policy ON characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own characters
CREATE POLICY characters_update_policy ON characters
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own characters
CREATE POLICY characters_delete_policy ON characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chats
-- Users can only see chats from their own simulations
CREATE POLICY chats_select_policy ON chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM simulations
      WHERE simulations.id = chats.simulation_id
      AND simulations.user_id = auth.uid()
    )
  );

-- Users can only insert chats for their own simulations
CREATE POLICY chats_insert_policy ON chats
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM simulations
      WHERE simulations.id = chats.simulation_id
      AND simulations.user_id = auth.uid()
    )
  );

-- Users can only update chats from their own simulations
CREATE POLICY chats_update_policy ON chats
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM simulations
      WHERE simulations.id = chats.simulation_id
      AND simulations.user_id = auth.uid()
    )
  );

-- Users can only delete chats from their own simulations
CREATE POLICY chats_delete_policy ON chats
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM simulations
      WHERE simulations.id = chats.simulation_id
      AND simulations.user_id = auth.uid()
    )
  );

-- RLS Policies for path_simulations
-- Users can see path_simulations for paths they own OR public paths
CREATE POLICY path_simulations_select_policy ON path_simulations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_simulations.path_id
      AND (paths.user_id = auth.uid() OR paths.is_public = true)
    )
  );

-- Users can only insert path_simulations for their own paths
CREATE POLICY path_simulations_insert_policy ON path_simulations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_simulations.path_id
      AND paths.user_id = auth.uid()
    )
  );

-- Users can only update path_simulations for their own paths
CREATE POLICY path_simulations_update_policy ON path_simulations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_simulations.path_id
      AND paths.user_id = auth.uid()
    )
  );

-- Users can only delete path_simulations for their own paths
CREATE POLICY path_simulations_delete_policy ON path_simulations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_simulations.path_id
      AND paths.user_id = auth.uid()
    )
  );

-- RLS Policies for path_progress
-- Users can see progress for public paths or their own paths
CREATE POLICY path_progress_select_policy ON path_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_progress.path_id
      AND (paths.is_public = true OR paths.user_id = auth.uid())
    )
    AND path_progress.user_identifier = auth.uid()::text
  );

-- Anyone can insert their own progress
CREATE POLICY path_progress_insert_policy ON path_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paths
      WHERE paths.id = path_progress.path_id
      AND (paths.is_public = true OR paths.user_id = auth.uid())
    )
    AND path_progress.user_identifier = auth.uid()::text
  );

-- Users can only update their own progress
CREATE POLICY path_progress_update_policy ON path_progress
  FOR UPDATE
  USING (path_progress.user_identifier = auth.uid()::text);

-- Users can only delete their own progress
CREATE POLICY path_progress_delete_policy ON path_progress
  FOR DELETE
  USING (path_progress.user_identifier = auth.uid()::text);

-- ai_settings and global_prompts remain accessible to all authenticated users (no RLS)
-- This keeps settings and system prompts global as requested
