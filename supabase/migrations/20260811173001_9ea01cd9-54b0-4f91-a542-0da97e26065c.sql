
-- 1. Tables
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'analyst' CHECK (role IN ('owner','admin','manager','analyst')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.client_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','manager','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
GRANT SELECT ON public.client_members TO authenticated;
GRANT ALL ON public.client_members TO service_role;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Backfill: one organization per existing managing user
INSERT INTO public.organizations (id, name)
SELECT gen_random_uuid(), COALESCE(NULLIF(p.full_name, ''), p.email, 'Organization')
FROM (SELECT DISTINCT user_id FROM public.clients WHERE user_id IS NOT NULL) c
JOIN public.profiles p ON p.id = c.user_id;

-- map orgs back to users via a temp join on name is unreliable; redo deterministically
DO $$
DECLARE r record; org uuid;
BEGIN
  -- clear the naive insert above
  DELETE FROM public.organizations o
  WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.organization_id = o.id);

  FOR r IN SELECT DISTINCT c.user_id, COALESCE(NULLIF(p.full_name,''), p.email, 'Organization') AS nm
           FROM public.clients c LEFT JOIN public.profiles p ON p.id = c.user_id
           WHERE c.user_id IS NOT NULL
  LOOP
    INSERT INTO public.organizations (name) VALUES (r.nm) RETURNING id INTO org;
    UPDATE public.clients SET organization_id = org WHERE user_id = r.user_id AND organization_id IS NULL;
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org, r.user_id, 'owner') ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

INSERT INTO public.client_members (client_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.clients WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.client_members (client_id, user_id, role)
SELECT id, client_user_id, 'viewer' FROM public.clients WHERE client_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Helper functions
CREATE OR REPLACE FUNCTION public.role_rank(_role text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _role
    WHEN 'owner' THEN 40
    WHEN 'admin' THEN 30
    WHEN 'manager' THEN 20
    WHEN 'analyst' THEN 10
    WHEN 'viewer' THEN 10
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid, _min_role text DEFAULT 'analyst')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org AND m.user_id = _user
      AND public.role_rank(m.role) >= public.role_rank(_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(_client uuid, _user uuid, _min_role text DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user IS NOT NULL AND (
    public.has_role(_user, 'superuser')
    OR EXISTS (
      SELECT 1 FROM public.client_members cm
      WHERE cm.client_id = _client AND cm.user_id = _user
        AND public.role_rank(cm.role) >= public.role_rank(_min_role)
    )
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = _client
        AND (
          c.user_id = _user
          OR (c.client_user_id = _user AND public.role_rank('viewer') >= public.role_rank(_min_role))
          OR (c.organization_id IS NOT NULL AND public.is_org_member(
                c.organization_id, _user,
                CASE WHEN public.role_rank(_min_role) >= 20 THEN 'manager' ELSE 'analyst' END))
        )
    )
  );
$$;

-- 4. Organization / membership policies
CREATE POLICY "Members view their organizations" ON public.organizations
FOR SELECT TO authenticated
USING (public.is_org_member(id, auth.uid()) OR public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Superusers manage organizations" ON public.organizations
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superuser'))
WITH CHECK (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Members view org membership" ON public.organization_members
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_org_member(organization_id, auth.uid()) OR public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Admins manage org membership" ON public.organization_members
FOR ALL TO authenticated
USING (public.is_org_member(organization_id, auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superuser'))
WITH CHECK (public.is_org_member(organization_id, auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Members view client membership" ON public.client_members
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_access_client(client_id, auth.uid()));

CREATE POLICY "Managers manage client membership" ON public.client_members
FOR ALL TO authenticated
USING (public.can_access_client(client_id, auth.uid(), 'manager'))
WITH CHECK (public.can_access_client(client_id, auth.uid(), 'manager'));

-- 5. Rewrite clients policies
DROP POLICY IF EXISTS "Users can update their clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients they manage" ON public.clients;
DROP POLICY IF EXISTS "Client users can view their own data" ON public.clients;
DROP POLICY IF EXISTS "Superusers can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their clients" ON public.clients;

CREATE POLICY "Members view clients" ON public.clients
FOR SELECT TO authenticated USING (public.can_access_client(id, auth.uid()));
CREATE POLICY "Managers update clients" ON public.clients
FOR UPDATE TO authenticated USING (public.can_access_client(id, auth.uid(), 'manager'))
WITH CHECK (public.can_access_client(id, auth.uid(), 'manager'));
CREATE POLICY "Managers delete clients" ON public.clients
FOR DELETE TO authenticated USING (public.can_access_client(id, auth.uid(), 'owner'));
CREATE POLICY "Users create clients" ON public.clients
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND (organization_id IS NULL OR public.is_org_member(organization_id, auth.uid(), 'manager'))
);

-- 6. Rewrite posts / analytics policies
DROP POLICY IF EXISTS "Users can view posts for their clients" ON public.posts;
DROP POLICY IF EXISTS "Client users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Superusers can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts for their clients" ON public.posts;
DROP POLICY IF EXISTS "Users can delete posts for their clients" ON public.posts;
DROP POLICY IF EXISTS "Users can update posts for their clients" ON public.posts;

CREATE POLICY "Members view posts" ON public.posts
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Managers insert posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (public.can_access_client(client_id, auth.uid(), 'manager'));
CREATE POLICY "Managers update posts" ON public.posts
FOR UPDATE TO authenticated USING (public.can_access_client(client_id, auth.uid(), 'manager'))
WITH CHECK (public.can_access_client(client_id, auth.uid(), 'manager'));
CREATE POLICY "Managers delete posts" ON public.posts
FOR DELETE TO authenticated USING (public.can_access_client(client_id, auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Users can create analytics for their clients" ON public.analytics;
DROP POLICY IF EXISTS "Users can view analytics for their clients" ON public.analytics;
DROP POLICY IF EXISTS "Client users can view their own analytics" ON public.analytics;
DROP POLICY IF EXISTS "Superusers can view all analytics" ON public.analytics;

CREATE POLICY "Members view analytics" ON public.analytics
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Managers insert analytics" ON public.analytics
FOR INSERT TO authenticated WITH CHECK (public.can_access_client(client_id, auth.uid(), 'manager'));

-- 7. Rewrite social_* policies
DROP POLICY IF EXISTS "Users can view their own social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can create social accounts for their clients" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can update their own social accounts" ON public.social_accounts;
DROP POLICY IF EXISTS "Users can delete their own social accounts" ON public.social_accounts;

CREATE POLICY "Members view social accounts" ON public.social_accounts
FOR SELECT TO authenticated USING (client_id IS NOT NULL AND public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Managers update social accounts" ON public.social_accounts
FOR UPDATE TO authenticated USING (client_id IS NOT NULL AND public.can_access_client(client_id, auth.uid(), 'manager'))
WITH CHECK (client_id IS NOT NULL AND public.can_access_client(client_id, auth.uid(), 'manager'));
CREATE POLICY "Managers delete social accounts" ON public.social_accounts
FOR DELETE TO authenticated USING (client_id IS NOT NULL AND public.can_access_client(client_id, auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Managers view social profiles" ON public.social_profiles;
CREATE POLICY "Members view social profiles" ON public.social_profiles
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));

DROP POLICY IF EXISTS "Managers view profile metrics" ON public.social_profile_metrics;
CREATE POLICY "Members view profile metrics" ON public.social_profile_metrics
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));

DROP POLICY IF EXISTS "Managers view social posts" ON public.social_posts;
CREATE POLICY "Members view social posts" ON public.social_posts
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));

DROP POLICY IF EXISTS "Managers view post metrics" ON public.social_post_metrics;
CREATE POLICY "Members view post metrics" ON public.social_post_metrics
FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));

DROP POLICY IF EXISTS "Managers view sync jobs" ON public.social_sync_jobs;
CREATE POLICY "Members view sync jobs" ON public.social_sync_jobs
FOR SELECT TO authenticated USING (client_id IS NOT NULL AND public.can_access_client(client_id, auth.uid()));

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
