# Multi-tenant service-provider architecture

Rework the app from "client belongs to one user" into an organization-based SaaS model, fix the access-control inconsistencies, and connect the dashboards to the new social data tables.

## Phase 1 — Tenancy foundation (database)

- New `organizations` table (name, created_at).
- New `organization_members` (organization_id, user_id, role: owner/admin/manager/analyst).
- New `client_members` (client_id, user_id, role: owner/manager/viewer).
- `clients` gains `organization_id`.
- Backfill: one organization per existing agency user; their clients move into it; existing `clients.user_id` becomes an owner membership; existing `client_user_id` becomes a viewer membership. Old columns stay for now so nothing breaks mid-migration.
- Security-definer helpers: `is_org_member(org, user, min_role)` and `can_access_client(client, user)` so policies never recurse.
- Every `social_*` policy, plus `clients`, `posts` and `analytics`, is rewritten on top of `can_access_client`. Superuser bypass stays.

## Phase 2 — Social account ownership

- Rename `social_accounts.user_id` to `connected_by_user_id` (the person who authorised, not the owner).
- Add `UNIQUE (provider, account_id)` so one external account can only ever be attached to one client; the connect flow returns a clear "already connected to another client" message.
- `oauth_states` gains `organization_id`.

## Phase 3 — Multiple accounts per platform (UI)

- Rewrite the connection panel: each platform lists *all* connected accounts (handle, followers, last sync, errors) with per-account Sync / Disconnect, plus a "Connect another" button.
- Meta: after OAuth, show a picker of the Facebook Pages and linked Instagram Professional accounts the authoriser administers, and let the user attach the chosen ones to the client.

## Phase 4 — Analytics on the new tables

- Client dashboard reads `social_profiles`, `social_profile_metrics`, `social_posts`, `social_post_metrics` instead of `analytics`/`posts`. Platform tabs are derived from what is actually connected.
- Filters: platform, account, and date range (7 / 30 / 90 / custom).
- New organization dashboard: client count, connected accounts, total followers/reach/engagement, posts this month, and a top-clients table — aggregated through an RLS-safe view/function, not client-side filtering.
- `posts` stays for scheduling; `analytics` is left untouched and unused by social reporting.

## Phase 5 — Sync at scale

- `social-sync-all`: selects stale accounts, batches them (25 per run) and fans out to `social-sync` with bounded concurrency (5 in flight) instead of a sequential loop.
- pg_cron job every 30 minutes invoking the scheduler.
- Provider pagination: initial import covers the last 90 days page by page; ongoing syncs fetch only new/changed posts.
- Metric snapshot throttling: hourly for the first 24h, every 6h to day 7, daily to day 30, weekly after — so `social_post_metrics` stops storing identical rows.

## Notes

- Provider app credentials (Meta, Google, LinkedIn) stay global to the service; only OAuth tokens are per-account. X stays disabled.
- Tokens remain unreadable from the browser; only service-role edge functions touch them.
- Phases 1 and 2 are migrations and need your approval as they run.
