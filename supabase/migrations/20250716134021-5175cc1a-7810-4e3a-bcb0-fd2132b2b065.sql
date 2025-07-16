
-- First, let's ensure we have proper indexes and constraints for the existing tables
-- Add index on user_roles for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Add index on clients for better querying
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_user_id ON clients(client_user_id);

-- Create a view to easily get user hierarchy information
CREATE OR REPLACE VIEW user_hierarchy AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  p.full_name,
  CASE 
    WHEN ur.role = 'client' THEN (
      SELECT json_build_object(
        'id', c.id,
        'name', c.name,
        'status', c.status,
        'industry', c.industry,
        'package_id', c.package_id
      )
      FROM clients c 
      WHERE c.client_user_id = u.id
    )
    ELSE NULL
  END as client_info,
  CASE 
    WHEN ur.role IN ('user', 'superuser') THEN (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'status', c.status,
          'industry', c.industry,
          'package_id', c.package_id
        )
      )
      FROM clients c 
      WHERE c.user_id = u.id
    )
    ELSE NULL
  END as managed_clients
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id;

-- Add RLS policy to allow superusers to view this hierarchy
CREATE POLICY "Superusers can view user hierarchy" 
  ON user_hierarchy 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'superuser'
    )
  );

-- Add function to deactivate users (sets their status in auth.users)
CREATE OR REPLACE FUNCTION deactivate_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only superusers can deactivate users
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'superuser'
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Update the user's email_confirmed_at to NULL to effectively deactivate
  -- and add a banned_until timestamp far in the future
  UPDATE auth.users 
  SET 
    email_confirmed_at = NULL,
    banned_until = now() + interval '100 years'
  WHERE id = target_user_id;
  
  -- Also update any associated client status
  UPDATE clients 
  SET status = 'inactive' 
  WHERE client_user_id = target_user_id OR user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

-- Add function to reactivate users
CREATE OR REPLACE FUNCTION reactivate_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only superusers can reactivate users
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'superuser'
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Reactivate the user
  UPDATE auth.users 
  SET 
    email_confirmed_at = now(),
    banned_until = NULL
  WHERE id = target_user_id;
  
  -- Also update any associated client status
  UPDATE clients 
  SET status = 'active' 
  WHERE client_user_id = target_user_id OR user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;
