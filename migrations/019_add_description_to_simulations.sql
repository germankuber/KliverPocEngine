-- Add description field to simulations table
ALTER TABLE simulations
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN simulations.description IS 'Brief description of the simulation shown at the start of the chat';
