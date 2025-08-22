-- Create oauth_states table for OAuth flow security
CREATE TABLE public.oauth_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  client_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Create policies for oauth_states (system table, no user access needed via API)
CREATE POLICY "System only access to oauth_states" 
ON public.oauth_states 
FOR ALL 
USING (false);