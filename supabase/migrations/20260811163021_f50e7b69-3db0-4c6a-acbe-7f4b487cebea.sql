
-- 1. Extend social_accounts
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS platform_account_type text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS profile_url text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS token_type text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_error text;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_client_provider_account_key
  ON public.social_accounts (client_id, provider, account_id);

-- Protect tokens from client-side reads
REVOKE ALL (access_token, refresh_token) ON public.social_accounts FROM anon, authenticated;

-- 2. oauth_states hardening columns
ALTER TABLE public.oauth_states
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS code_verifier text,
  ADD COLUMN IF NOT EXISTS redirect_uri text;

-- 3. social_profiles
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  username text,
  display_name text,
  profile_url text,
  avatar_url text,
  bio text,
  followers_count bigint DEFAULT 0,
  following_count bigint DEFAULT 0,
  posts_count bigint DEFAULT 0,
  raw_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
GRANT SELECT ON public.social_profiles TO authenticated;
GRANT ALL ON public.social_profiles TO service_role;
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view social profiles" ON public.social_profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = social_profiles.client_id
    AND (c.user_id = auth.uid() OR c.client_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'superuser'));

-- 4. social_profile_metrics
CREATE TABLE IF NOT EXISTS public.social_profile_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  followers bigint,
  following bigint,
  posts_count bigint,
  impressions bigint,
  reach bigint,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  engagement_rate numeric,
  engagement_rate_basis text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_profile_metrics_account_time_idx
  ON public.social_profile_metrics (social_account_id, recorded_at DESC);
GRANT SELECT ON public.social_profile_metrics TO authenticated;
GRANT ALL ON public.social_profile_metrics TO service_role;
ALTER TABLE public.social_profile_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view profile metrics" ON public.social_profile_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = social_profile_metrics.client_id
    AND (c.user_id = auth.uid() OR c.client_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'superuser'));

-- 5. social_posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_post_id text NOT NULL,
  post_url text,
  content text,
  media_type text,
  thumbnail_url text,
  published_at timestamptz,
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  saves bigint DEFAULT 0,
  views bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  engagement_rate numeric,
  engagement_rate_basis text,
  raw_data jsonb,
  last_metrics_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_post_id)
);
CREATE INDEX IF NOT EXISTS social_posts_client_published_idx
  ON public.social_posts (client_id, published_at DESC);
GRANT SELECT ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view social posts" ON public.social_posts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = social_posts.client_id
    AND (c.user_id = auth.uid() OR c.client_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'superuser'));

-- 6. social_post_metrics
CREATE TABLE IF NOT EXISTS public.social_post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  likes bigint DEFAULT 0,
  comments bigint DEFAULT 0,
  shares bigint DEFAULT 0,
  saves bigint DEFAULT 0,
  views bigint DEFAULT 0,
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  engagement_rate numeric,
  engagement_rate_basis text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_post_metrics_post_time_idx
  ON public.social_post_metrics (social_post_id, recorded_at DESC);
GRANT SELECT ON public.social_post_metrics TO authenticated;
GRANT ALL ON public.social_post_metrics TO service_role;
ALTER TABLE public.social_post_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view post metrics" ON public.social_post_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = social_post_metrics.client_id
    AND (c.user_id = auth.uid() OR c.client_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'superuser'));

-- 7. social_sync_jobs
CREATE TABLE IF NOT EXISTS public.social_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  records_processed integer DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_sync_jobs_account_idx
  ON public.social_sync_jobs (social_account_id, created_at DESC);
GRANT SELECT ON public.social_sync_jobs TO authenticated;
GRANT ALL ON public.social_sync_jobs TO service_role;
ALTER TABLE public.social_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers view sync jobs" ON public.social_sync_jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = social_sync_jobs.client_id
    AND (c.user_id = auth.uid() OR c.client_user_id = auth.uid()))
    OR public.has_role(auth.uid(), 'superuser'));

-- updated_at triggers
CREATE TRIGGER update_social_profiles_updated_at BEFORE UPDATE ON public.social_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
