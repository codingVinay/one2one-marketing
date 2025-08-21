-- Create social_accounts table for OAuth integration
CREATE TABLE public.social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('facebook','instagram','twitter','linkedin','youtube','tiktok')),
  account_id TEXT NOT NULL, -- platform-specific user/account ID
  account_name TEXT, -- display name for the account
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, provider, account_id)
);

-- Enable RLS
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for social_accounts
CREATE POLICY "Users can view their own social accounts" 
ON public.social_accounts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = social_accounts.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create social accounts for their clients" 
ON public.social_accounts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = social_accounts.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own social accounts" 
ON public.social_accounts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = social_accounts.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own social accounts" 
ON public.social_accounts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = social_accounts.client_id 
    AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Superusers can manage all social accounts" 
ON public.social_accounts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'superuser'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_social_accounts_updated_at
BEFORE UPDATE ON public.social_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();