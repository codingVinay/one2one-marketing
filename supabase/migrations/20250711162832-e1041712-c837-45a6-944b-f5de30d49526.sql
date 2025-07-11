
-- First, let's drop the problematic recursive policies
DROP POLICY IF EXISTS "Superusers can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superusers can manage user roles" ON public.user_roles;

-- Create a simple policy that allows users to view their own role
-- and allows the specific superuser emails to access all roles
CREATE POLICY "Users can view roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT auth.email()) = 'contactmevinayshetty@gmail.com'
  );

-- Create a policy for managing roles (insert/update/delete)
CREATE POLICY "Manage user roles" 
  ON public.user_roles 
  FOR ALL 
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT auth.email()) = 'contactmevinayshetty@gmail.com'
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    (SELECT auth.email()) = 'contactmevinayshetty@gmail.com'
  );
