-- Create mood_behaviors table to store behavior configurations for each mood
CREATE TABLE IF NOT EXISTS public.mood_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_id UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  behavior_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE public.mood_behaviors ENABLE ROW LEVEL SECURITY;

-- Users can view their own mood behaviors
CREATE POLICY "Users can view own mood behaviors"
  ON public.mood_behaviors FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own mood behaviors
CREATE POLICY "Users can insert own mood behaviors"
  ON public.mood_behaviors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own mood behaviors
CREATE POLICY "Users can update own mood behaviors"
  ON public.mood_behaviors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own mood behaviors
CREATE POLICY "Users can delete own mood behaviors"
  ON public.mood_behaviors FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_mood_behaviors_mood_id ON public.mood_behaviors(mood_id);
