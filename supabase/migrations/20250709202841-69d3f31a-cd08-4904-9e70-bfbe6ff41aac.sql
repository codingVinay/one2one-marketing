
-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Superusers can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superusers can manage user roles" ON public.user_roles;

-- Create a security definer function to safely check user roles
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = check_user_role.user_id 
    AND user_roles.role = check_user_role.required_role
  );
$$;

-- Now create non-recursive policies using the function
-- Users can always view their own role
CREATE POLICY "Users can view their own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Superusers can view all roles (using the safe function)
CREATE POLICY "Superusers can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (public.check_user_role(auth.uid(), 'superuser'));

-- Superusers can manage all roles (using the safe function)
CREATE POLICY "Superusers can manage user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (public.check_user_role(auth.uid(), 'superuser'));

-- Insert the superuser role for contactmevinayshetty@gmail.com
-- First, let's get the user ID and insert the role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superuser'
FROM auth.users 
WHERE email = 'contactmevinayshetty@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'superuser';
