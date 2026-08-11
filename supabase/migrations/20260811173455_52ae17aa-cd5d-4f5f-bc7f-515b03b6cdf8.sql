
ALTER TABLE public.social_accounts RENAME COLUMN user_id TO connected_by_user_id;
ALTER TABLE public.social_accounts ALTER COLUMN connected_by_user_id DROP NOT NULL;

-- One external account may only be attached to one client.
DELETE FROM public.social_accounts a
USING public.social_accounts b
WHERE a.provider = b.provider AND a.account_id = b.account_id
  AND a.is_active = false AND b.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_provider_account_key
ON public.social_accounts (provider, account_id);

ALTER TABLE public.oauth_states ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.role_rank(_role text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'owner' THEN 40
    WHEN 'admin' THEN 30
    WHEN 'manager' THEN 20
    WHEN 'analyst' THEN 10
    WHEN 'viewer' THEN 10
    ELSE 0 END;
$$;
