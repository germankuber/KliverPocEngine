-- Create moods table
CREATE TABLE IF NOT EXISTS public.moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  context TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

-- Users can view their own moods
CREATE POLICY "Users can view own moods"
  ON public.moods FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own moods
CREATE POLICY "Users can insert own moods"
  ON public.moods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own moods
CREATE POLICY "Users can update own moods"
  ON public.moods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own moods
CREATE POLICY "Users can delete own moods"
  ON public.moods FOR DELETE
  USING (auth.uid() = user_id);

-- Insert default moods for existing users
INSERT INTO public.moods (name, context, user_id)
SELECT 'cooperative', 'The character is friendly, helpful, and willing to collaborate with others.', id
FROM auth.users
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.moods (name, context, user_id)
SELECT 'angry', 'The character is irritated, confrontational, and responds with hostility or frustration.', id
FROM auth.users
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_moods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER moods_updated_at
  BEFORE UPDATE ON public.moods
  FOR EACH ROW
  EXECUTE FUNCTION update_moods_updated_at();
