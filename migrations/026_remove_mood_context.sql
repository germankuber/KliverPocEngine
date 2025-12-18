-- Remove context column from moods table as behaviors now handle the prompts
ALTER TABLE public.moods
DROP COLUMN IF EXISTS context;
