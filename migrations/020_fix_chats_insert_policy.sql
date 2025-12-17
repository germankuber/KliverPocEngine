-- Fix chats insert policy to allow authenticated users to create chats for their own simulations
-- This allows both:
-- 1. Anonymous users to create chats for public path simulations
-- 2. Authenticated users to create chats for their own simulations

DROP POLICY IF EXISTS chats_insert_policy ON chats;

CREATE POLICY chats_insert_policy ON chats
  FOR INSERT
  WITH CHECK (
    -- Allow if it's a public path simulation (for anonymous users)
    EXISTS (
      SELECT 1 FROM simulations s
      JOIN path_simulations ps ON ps.simulation_id = s.id
      JOIN paths p ON p.id = ps.path_id
      WHERE s.id = chats.simulation_id
      AND p.is_public = true
    )
    OR
    -- Allow if the user owns the simulation (for authenticated users)
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM simulations 
      WHERE simulations.id = chats.simulation_id 
      AND simulations.user_id = auth.uid()
    ))
  );

-- Add comment
COMMENT ON POLICY chats_insert_policy ON chats IS 'Allows anonymous users to create chats for public paths and authenticated users to create chats for their own simulations';
