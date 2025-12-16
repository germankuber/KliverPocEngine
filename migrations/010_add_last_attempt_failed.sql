-- Add last_attempt_failed column to path_progress
ALTER TABLE path_progress
ADD COLUMN IF NOT EXISTS last_attempt_failed BOOLEAN DEFAULT false;

COMMENT ON COLUMN path_progress.last_attempt_failed IS 'Indicates if the last attempt for this simulation failed';
