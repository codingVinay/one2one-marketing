ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS bundle_team_id text;
CREATE UNIQUE INDEX IF NOT EXISTS clients_bundle_team_id_key ON public.clients(bundle_team_id) WHERE bundle_team_id IS NOT NULL;

ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS bundle_account_id text,
  ADD COLUMN IF NOT EXISTS bundle_team_id text;
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_bundle_account_id_key ON public.social_accounts(bundle_account_id) WHERE bundle_account_id IS NOT NULL;
ALTER TABLE public.social_accounts ALTER COLUMN access_token SET DEFAULT '';

CREATE TABLE IF NOT EXISTS public.bundle_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  force_refreshes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bundle_api_usage_date_key UNIQUE (usage_date)
);
GRANT SELECT ON public.bundle_api_usage TO authenticated;
GRANT ALL ON public.bundle_api_usage TO service_role;
ALTER TABLE public.bundle_api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superusers can view bundle api usage" ON public.bundle_api_usage;
CREATE POLICY "Superusers can view bundle api usage" ON public.bundle_api_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superuser'));