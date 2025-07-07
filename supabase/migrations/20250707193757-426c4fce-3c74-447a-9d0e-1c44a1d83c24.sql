
-- Add client_user_id to clients table to link clients to their login accounts
ALTER TABLE public.clients ADD COLUMN client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create a user_roles table to distinguish between admin users and client users
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create packages table for client subscription details
CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_posts INTEGER NOT NULL DEFAULT 0,
  platforms TEXT[] DEFAULT '{}',
  price DECIMAL(10,2),
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add package_id to clients table
ALTER TABLE public.clients ADD COLUMN package_id UUID REFERENCES public.packages(id);

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles (admins can manage all, users can view their own)
CREATE POLICY "Admins can view all user roles" 
  ON public.user_roles 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

CREATE POLICY "Users can view their own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create user roles" 
  ON public.user_roles 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- RLS policies for packages (clients can view all packages, admins can manage)
CREATE POLICY "All authenticated users can view packages" 
  ON public.packages 
  FOR SELECT 
  TO authenticated;

CREATE POLICY "Admins can manage packages" 
  ON public.packages 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- Update RLS policies for clients to allow client users to view their own data
CREATE POLICY "Client users can view their own data" 
  ON public.clients 
  FOR SELECT 
  USING (auth.uid() = client_user_id);

-- Update RLS policies for posts to allow client users to view their own posts
CREATE POLICY "Client users can view their own posts" 
  ON public.posts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = posts.client_id 
    AND clients.client_user_id = auth.uid()
  ));

-- Update RLS policies for analytics to allow client users to view their own analytics
CREATE POLICY "Client users can view their own analytics" 
  ON public.analytics 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = analytics.client_id 
    AND clients.client_user_id = auth.uid()
  ));

-- Insert some sample packages
INSERT INTO public.packages (name, description, monthly_posts, platforms, price, features) VALUES 
('Basic Package', 'Perfect for small businesses getting started', 10, ARRAY['facebook', 'instagram'], 299.00, ARRAY['10 posts per month', 'Basic analytics', 'Email support']),
('Professional Package', 'Ideal for growing businesses', 20, ARRAY['facebook', 'instagram', 'twitter', 'linkedin'], 599.00, ARRAY['20 posts per month', 'Advanced analytics', 'Priority support', 'Custom content calendar']),
('Enterprise Package', 'For large organizations with complex needs', 50, ARRAY['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'], 1299.00, ARRAY['50 posts per month', 'Full analytics suite', '24/7 support', 'Dedicated account manager', 'Custom reporting']);

-- Create indexes for better performance
CREATE INDEX idx_clients_client_user_id ON public.clients(client_user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
