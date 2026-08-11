# Social data ingestion & analytics layer

Extend the existing app with a real provider sync pipeline instead of the current placeholder OAuth + generic analytics buckets. Ship in phases; each phase is usable on its own.

## Scope decisions
- Zero-cost providers first: YouTube, Facebook Page, Instagram Professional (one Meta integration).
- LinkedIn built but flagged "approval required".
- X/Twitter architecturally supported but disabled by default (pay-per-use API); optional BYOK later.

## Phase 1 — Database
New tables (with GRANTs + RLS mirroring the existing client-scoped rules):
- `social_profiles` — current profile snapshot per connected account
- `social_profile_metrics` — historical follower/reach/engagement snapshots
- `social_posts` — posts pulled from platforms (separate from the scheduling `posts` table)
- `social_post_metrics` — per-post historical snapshots
- `social_sync_jobs` — sync run status

Alter `social_accounts`: add `platform_account_type, username, profile_url, avatar_url, token_type, last_synced_at, sync_status, sync_error`.

Token protection: revoke column access to `access_token`/`refresh_token` from `anon`/`authenticated` so only edge functions (service role) can read them; frontend selects explicit safe columns.

Existing `clients`, `posts`, `analytics` stay untouched.

## Phase 2 — OAuth hardening
- Real per-transaction PKCE (`code_verifier` stored on `oauth_states`), no hardcoded `challenge`.
- Store `user_id` + `client_id` server-side on the state row; callback trusts only the state, not browser-supplied IDs.
- Provider-correct scopes (adds `yt-analytics.readonly` for YouTube, Meta page/IG scopes).
- Expiry + revoked-token handling and refresh support.

## Phase 3 — Provider adapters
`supabase/functions/social-sync/providers/{youtube,meta,linkedin,x}.ts` implementing a shared `SocialProvider` interface (`exchangeCode`, `refreshToken`, `getProfile`, `getPosts`, `getProfileMetrics`, `getPostMetrics`) plus a normalizer that writes into the new tables. Build order: YouTube → Meta (FB+IG) → LinkedIn → X (disabled).

## Phase 4 — Sync engine
- `social-sync` edge function: sync one account or all due accounts, writing snapshots and job rows.
- `social-disconnect` edge function: revoke + deactivate.
- Tiered freshness to stay in free quotas: profile 6h, recent posts 1–6h, 8–30 day posts 12h, older daily; full backfill once on connect.
- Connect flow enqueues an async initial sync instead of blocking the callback.
- Optional pg_cron schedule for periodic sync (added at the end).

## Phase 5 — Frontend
- Hooks: `useSocialAccounts`, `useSocialProfiles`, `useSocialPosts`, `useSocialAnalytics`, `useSocialSync`.
- Components under `src/components/social/`: account card with sync status + "Sync Now", platform selector, profile stats, post table with filters, post detail with metric history, charts.
- Rewrite `ClientAnalytics.tsx`: no hardcoded platforms or Jan–Jun months; derive everything from connected accounts and metric snapshots.
- Correct math: followers = latest snapshot (never summed), growth = latest vs previous, engagement rate stored with its `basis` (reach vs impressions).

## Notes
- Provider API credentials (Meta app, Google/YouTube, LinkedIn) must be added as secrets before real data can flow; the pipeline degrades to "not configured" until then.
- Delivery order: Phase 1+2 together, then Phase 3+4 per provider, then Phase 5.
