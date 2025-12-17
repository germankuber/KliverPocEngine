-- Migration 017: Add User Roles
-- Purpose: Add role-based access control (admin/user)
-- Only admins can access AI Settings

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Add comment
COMMENT ON TABLE user_roles IS 'Stores user roles for access control';
COMMENT ON COLUMN user_roles.role IS 'User role: admin or user';

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
-- Users can see their own role
CREATE POLICY user_roles_select_policy ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert/update/delete roles (admins manage via direct SQL)
-- No insert/update/delete policies means only service_role can modify

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant admin role to german.kuber@gmail.com
-- This will be executed when the user exists
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get user ID for german.kuber@gmail.com
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'german.kuber@gmail.com';
  
  -- If user exists, grant admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Admin role granted to german.kuber@gmail.com';
  ELSE
    RAISE NOTICE 'User german.kuber@gmail.com not found. Run this migration again after creating the user.';
  END IF;
END $$;

-- Create a trigger function to assign default 'user' role to new users
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign 'user' role to new users by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users (note: this requires auth schema access)
-- If this fails, roles will need to be assigned manually or via application code
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();
