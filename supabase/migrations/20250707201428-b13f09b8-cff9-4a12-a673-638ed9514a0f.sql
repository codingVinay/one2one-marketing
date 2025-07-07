
-- Update the user_roles table to support three user types
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('superuser', 'user', 'client'));

-- Update the default role in the user_roles table
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'client';

-- Update RLS policies for user_roles to handle the new superuser role
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can create user roles" ON public.user_roles;

-- Superusers can view all user roles
CREATE POLICY "Superusers can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Superusers can create/manage user roles
CREATE POLICY "Superusers can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Update RLS policies for packages to handle superuser role
DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;

CREATE POLICY "Superusers can manage packages" 
  ON public.packages 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Update RLS policies for clients to handle the new role system
-- Superusers can view all clients
CREATE POLICY "Superusers can view all clients" 
  ON public.clients 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Superusers can manage all clients
CREATE POLICY "Superusers can manage all clients" 
  ON public.clients 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Update RLS policies for posts to handle superuser access
CREATE POLICY "Superusers can view all posts" 
  ON public.posts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

CREATE POLICY "Superusers can manage all posts" 
  ON public.posts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Update RLS policies for analytics to handle superuser access
CREATE POLICY "Superusers can view all analytics" 
  ON public.analytics 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

CREATE POLICY "Superusers can manage all analytics" 
  ON public.analytics 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));
