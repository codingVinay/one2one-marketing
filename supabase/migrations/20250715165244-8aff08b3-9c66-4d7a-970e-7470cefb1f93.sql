
-- Create a table for pending user registrations awaiting approval
CREATE TABLE public.pending_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('user', 'client')),
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For client accounts
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pending_users table
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Policy for superusers to manage all pending users
CREATE POLICY "Superusers can manage all pending users" 
  ON public.pending_users 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'superuser'
  ));

-- Policy for users to view their own pending registration
CREATE POLICY "Users can view their own pending registration" 
  ON public.pending_users 
  FOR SELECT 
  USING (requested_by_user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_pending_users_status ON public.pending_users(status);
CREATE INDEX idx_pending_users_email ON public.pending_users(email);
