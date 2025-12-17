-- Migration 018: Fix Public Access to Paths
-- Purpose: Allow anonymous (non-authenticated) users to access public paths

-- Drop the existing paths_select_policy
DROP POLICY IF EXISTS paths_select_policy ON paths;

-- Create new policy that allows anonymous access to public paths
CREATE POLICY paths_select_policy ON paths
  FOR SELECT
  USING (
    is_public = true OR 
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- Allow anonymous users to read public path simulations
-- First check if policy exists and drop it
DROP POLICY IF EXISTS path_simulations_select_policy ON path_simulations;

CREATE POLICY path_simulations_select_policy ON path_simulations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paths 
      WHERE paths.id = path_simulations.path_id 
      AND paths.is_public = true
    )
    OR
    EXISTS (
      SELECT 1 FROM paths 
      WHERE paths.id = path_simulations.path_id 
      AND auth.uid() IS NOT NULL
      AND auth.uid() = paths.user_id
    )
  );

-- Allow anonymous users to read simulations that are part of public paths
DROP POLICY IF EXISTS simulations_select_policy ON simulations;

CREATE POLICY simulations_select_policy ON simulations
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    EXISTS (
      SELECT 1 FROM path_simulations ps
      JOIN paths p ON p.id = ps.path_id
      WHERE ps.simulation_id = simulations.id
      AND p.is_public = true
    )
  );

-- Allow anonymous users to read characters that are used in public path simulations
DROP POLICY IF EXISTS characters_select_policy ON characters;

CREATE POLICY characters_select_policy ON characters
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    EXISTS (
      SELECT 1 FROM simulations s
      JOIN path_simulations ps ON ps.simulation_id = s.id
      JOIN paths p ON p.id = ps.path_id
      WHERE s.character_id = characters.id
      AND p.is_public = true
    )
  );

-- Allow anonymous users to insert path progress
DROP POLICY IF EXISTS path_progress_insert_policy ON path_progress;

CREATE POLICY path_progress_insert_policy ON path_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paths 
      WHERE paths.id = path_progress.path_id 
      AND paths.is_public = true
    )
  );

-- Allow users to select their own path progress (by user_identifier)
DROP POLICY IF EXISTS path_progress_select_policy ON path_progress;

CREATE POLICY path_progress_select_policy ON path_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paths 
      WHERE paths.id = path_progress.path_id 
      AND paths.is_public = true
    )
  );

-- Allow users to update their own path progress
DROP POLICY IF EXISTS path_progress_update_policy ON path_progress;

CREATE POLICY path_progress_update_policy ON path_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM paths 
      WHERE paths.id = path_progress.path_id 
      AND paths.is_public = true
    )
  );

-- Allow anonymous users to insert chats for public paths
DROP POLICY IF EXISTS chats_insert_policy ON chats;

CREATE POLICY chats_insert_policy ON chats
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM simulations s
      JOIN path_simulations ps ON ps.simulation_id = s.id
      JOIN paths p ON p.id = ps.path_id
      WHERE s.id = chats.simulation_id
      AND p.is_public = true
    )
  );

-- Allow anonymous users to select chats they created (by user_identifier)
DROP POLICY IF EXISTS chats_select_policy ON chats;

CREATE POLICY chats_select_policy ON chats
  FOR SELECT
  USING (
    user_identifier IS NOT NULL
    OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM simulations 
      WHERE simulations.id = chats.simulation_id 
      AND simulations.user_id = auth.uid()
    ))
  );

-- Allow anonymous users to update chats they created
DROP POLICY IF EXISTS chats_update_policy ON chats;

CREATE POLICY chats_update_policy ON chats
  FOR UPDATE
  USING (
    user_identifier IS NOT NULL
    OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM simulations 
      WHERE simulations.id = chats.simulation_id 
      AND simulations.user_id = auth.uid()
    ))
  );

-- Allow public access to chat analysis results (analysis_result column)
-- This enables anonymous users to view analysis results via /analyses/:id route
COMMENT ON COLUMN chats.analysis_result IS 'Public analysis result viewable by anyone with chat ID';
COMMENT ON COLUMN chats.analysis_updated_at IS 'Timestamp when analysis was last updated';
