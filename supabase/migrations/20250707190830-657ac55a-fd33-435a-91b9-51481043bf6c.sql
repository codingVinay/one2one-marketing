
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  email TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  platforms TEXT[] DEFAULT '{}',
  monthly_posts INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  engagement_stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics table
CREATE TABLE public.analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can view clients they manage" 
  ON public.clients 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create clients" 
  ON public.clients 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their clients" 
  ON public.clients 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their clients" 
  ON public.clients 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for posts
CREATE POLICY "Users can view posts for their clients" 
  ON public.posts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = posts.client_id 
    AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create posts for their clients" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = posts.client_id 
    AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update posts for their clients" 
  ON public.posts 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = posts.client_id 
    AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete posts for their clients" 
  ON public.posts 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = posts.client_id 
    AND clients.user_id = auth.uid()
  ));

-- Create RLS policies for analytics
CREATE POLICY "Users can view analytics for their clients" 
  ON public.analytics 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = analytics.client_id 
    AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create analytics for their clients" 
  ON public.analytics 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = analytics.client_id 
    AND clients.user_id = auth.uid()
  ));

-- Create indexes for better performance
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_posts_client_id ON public.posts(client_id);
CREATE INDEX idx_analytics_client_id ON public.analytics(client_id);
CREATE INDEX idx_analytics_date ON public.analytics(date_recorded);
