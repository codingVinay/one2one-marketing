
CREATE TABLE public.pending_social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  connected_by_user_id uuid NOT NULL,
  user_access_token text NOT NULL,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pending_social_connections TO service_role;
ALTER TABLE public.pending_social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System only access to pending social connections"
ON public.pending_social_connections FOR ALL USING (false);
