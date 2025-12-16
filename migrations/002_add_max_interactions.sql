-- Add max_interactions to simulations table
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS max_interactions INTEGER DEFAULT 10;

