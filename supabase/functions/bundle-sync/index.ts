import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { bundleFetch, isBundleConfigured, providerFor } from "../_shared/bundle/client.ts";
import { saveProfile, savePosts, startJob, finishJob } from "../_shared/social/store.ts";
import type { PostData, SocialAccountRow } from "../_shared/social/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** bundle.social refreshes analytics every 24h, so pulling more often is waste. */
const FRESH_MS = 6 * 60 * 60 * 1000;
/** Their force-refresh budget is teams x 5 per day; we only ever use teams x 2. */
const FORCE_PER_TEAM = 2;
const POST_LIMIT = 25;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

type Db = ReturnType<typeof admin>;

/** Consume one unit of today's force-refresh budget; false when exhausted. */
async function takeForceBudget(db: Db): Promise<boolean> {
  const { count } = await db
    .from("clients")
    .select("id", { count: "exact", head: true })
    .not("bundle_team_id", "is", null);
  const cap = Math.max(1, (count ?? 1) * FORCE_PER_TEAM);
  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await db
    .from("bundle_api_usage")
    .select("id,force_refreshes")
    .eq("usage_date", today)
    .maybeSingle();

  if (!row) {
    await db.from("bundle_api_usage").insert({ usage_date: today, force_refreshes: 1 });
    return true;
  }
  if (row.force_refreshes >= cap) return false;
  await db
    .from("bundle_api_usage")
    .update({ force_refreshes: row.force_refreshes + 1 })
    .eq("id", row.id);
  return true;
}

/** Mirror the team's bundle.social accounts into social_accounts. */
async function importAccounts(db: Db, client: { id: string; bundle_team_id: string }) {
  const team = await bundleFetch<{ socialAccounts?: any[] }>({
    path: `/team/${client.bundle_team_id}`,
  });
  const remote = (team.socialAccounts ?? []).filter((a) => a.type !== "TWITTER" && !a.deletedAt);

  for (const account of remote) {
    const row = {
      client_id: client.id,
      provider: providerFor(account.type),
      account_id: account.externalId ?? account.id,
      account_name: account.displayName ?? account.userDisplayName ?? account.username ?? null,
      username: account.username ?? account.userUsername ?? null,
      avatar_url: account.avatarUrl ?? null,
      access_token: "",
      refresh_token: null,
      is_active: true,
      source: "bundle",
      bundle_account_id: account.id,
      bundle_team_id: client.bundle_team_id,
      platform_account_type: account.instagramConnectionMethod ?? null,
      sync_status: "pending",
      sync_error: null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await db
      .from("social_accounts")
      .select("id")
      .eq("bundle_account_id", account.id)
      .maybeSingle();

    if (existing) {
      await db.from("social_accounts").update(row).eq("id", existing.id);
    } else {
      await db.from("social_accounts").insert(row);
    }
  }

  // Accounts removed on bundle.social side are deactivated locally.
  const liveIds = remote.map((a) => a.id);
  const stale = db
    .from("social_accounts")
    .update({ is_active: false, sync_status: "disconnected" })
    .eq("client_id", client.id)
    .eq("source", "bundle")
    .eq("is_active", true);
  await (liveIds.length ? stale.not("bundle_account_id", "in", `(${liveIds.join(",")})`) : stale);

  return remote;
}

async function syncPosts(db: Db, account: SocialAccountRow & { bundle_team_id: string }, type: string) {
  const list = await bundleFetch<{ items?: any[] }>({
    path: "/post/",
    query: { teamId: account.bundle_team_id, status: "POSTED", limit: POST_LIMIT, platforms: [type] },
  });
  const items = list.items ?? [];
  if (items.length === 0) return 0;

  let analytics: Record<string, any> = {};
  try {
    const bulk = await bundleFetch<{ results?: any[] }>({
      path: "/analytics/post/bulk",
      query: { postIds: items.map((p) => p.id), platformType: type, limit: POST_LIMIT },
    });
    for (const result of bulk.results ?? []) {
      const latest = (result.items ?? []).at(-1);
      if (latest) analytics[result.postId] = latest;
    }
  } catch (error) {
    console.warn("Post analytics unavailable:", (error as Error).message);
  }

  const posts: PostData[] = items.map((p) => {
    const metrics = analytics[p.id] ?? {};
    const platformData = p.data?.[type] ?? {};
    const interactions = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0);
    const basis = metrics.impressions || metrics.views || 0;
    return {
      external_post_id: `${p.id}:${type}`,
      post_url: metrics.permalink ?? null,
      content: platformData.text ?? platformData.description ?? p.title ?? null,
      media_type: platformData.type ?? null,
      thumbnail_url: platformData.thumbnail ?? null,
      published_at: p.postedDate ?? p.postDate ?? null,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
      shares: metrics.shares ?? 0,
      saves: metrics.saves ?? 0,
      views: metrics.views ?? 0,
      impressions: metrics.impressions ?? 0,
      reach: metrics.impressionsUnique ?? metrics.viewsUnique ?? 0,
      engagement_rate: basis > 0 ? Number(((interactions / basis) * 100).toFixed(2)) : null,
      engagement_rate_basis: basis > 0 ? (metrics.impressions ? "impressions" : "views") : null,
      raw_data: metrics,
    };
  });

  return await savePosts(db, account, posts);
}

async function syncAccount(db: Db, account: any, opts: { force: boolean; jobType: string }) {
  const jobId = await startJob(db, account, opts.jobType);
  try {
    const type = account.bundle_type as string;

    if (opts.force && (await takeForceBudget(db))) {
      try {
        await bundleFetch({
          method: "POST",
          path: "/analytics/social-account/force",
          body: { teamId: account.bundle_team_id, platformType: type },
        });
      } catch (error) {
        console.warn("Force refresh skipped:", (error as Error).message);
      }
    }

    const analytics = await bundleFetch<{ socialAccount: any; items: any[] }>({
      path: "/analytics/social-account",
      query: { teamId: account.bundle_team_id, platformType: type },
    });
    const remote = analytics.socialAccount ?? {};
    const latest = (analytics.items ?? []).at(-1) ?? {};

    const interactions = (latest.likes ?? 0) + (latest.comments ?? 0);
    const basis = latest.impressions || latest.views || 0;

    await saveProfile(
      db,
      account,
      {
        external_id: remote.externalId ?? account.account_id,
        username: remote.username ?? account.username,
        display_name: remote.displayName ?? account.account_name,
        avatar_url: remote.avatarUrl ?? account.avatar_url,
        bio: remote.bio ?? null,
        followers_count: latest.followers ?? 0,
        following_count: latest.following ?? 0,
        posts_count: latest.postCount ?? 0,
        raw_data: remote,
      },
      {
        impressions: latest.impressions ?? null,
        reach: latest.impressionsUnique ?? null,
        views: latest.views ?? null,
        likes: latest.likes ?? null,
        comments: latest.comments ?? null,
        engagement_rate: basis > 0 ? Number(((interactions / basis) * 100).toFixed(2)) : null,
        engagement_rate_basis: basis > 0 ? (latest.impressions ? "impressions" : "views") : null,
        raw_data: latest,
      },
    );

    let posts = 0;
    try {
      posts = await syncPosts(db, account, type);
    } catch (error) {
      console.warn("Post sync failed:", (error as Error).message);
    }

    await finishJob(db, jobId, account.id, { ok: true, records: posts + 1 });
    return { accountId: account.id, provider: account.provider, ok: true, posts };
  } catch (error) {
    const message = (error as Error).message;
    console.error(`bundle sync failed for ${account.id}:`, message);
    await finishJob(db, jobId, account.id, { ok: false, error: message });
    return { accountId: account.id, provider: account.provider, ok: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = admin();
  try {
    if (!isBundleConfigured()) {
      return json({ error: "bundle.social is not configured yet." }, 400);
    }

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const body = await req.json().catch(() => ({}));

    const isInternal = (!!jwt && jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ||
      (!!cronSecret && cronSecret === Deno.env.get("SOCIAL_CRON_SECRET"));

    let callerId: string | null = null;
    if (!isInternal) {
      if (!jwt) return json({ error: "Not authenticated" }, 401);
      const { data: claims, error } = await db.auth.getClaims(jwt);
      callerId = (claims as any)?.claims?.sub ?? null;
      if (error || !callerId) {
        return json({ error: "Your session has expired. Please sign in again." }, 401);
      }
    }

    let clients: any[] = [];
    if (body.clientId) {
      if (!isInternal) {
        const { data: allowed } = await db.rpc("can_access_client", {
          _client: body.clientId,
          _user: callerId,
          _min_role: "viewer",
        });
        if (!allowed) return json({ error: "You do not have access to this client" }, 403);
      }
      const { data } = await db
        .from("clients")
        .select("id,bundle_team_id")
        .eq("id", body.clientId)
        .not("bundle_team_id", "is", null);
      clients = data ?? [];
    } else if (body.scheduled) {
      if (!isInternal) return json({ error: "Not allowed" }, 403);
      const { data } = await db
        .from("clients")
        .select("id,bundle_team_id")
        .not("bundle_team_id", "is", null)
        .limit(25);
      clients = data ?? [];
    } else {
      return json({ error: "clientId or scheduled is required" }, 400);
    }

    if (clients.length === 0) return json({ synced: [], message: "Nothing to sync" });

    const force = !!body.force && !body.scheduled;
    const jobType = body.jobType ?? (body.scheduled ? "scheduled" : "manual");
    const results: unknown[] = [];

    for (const client of clients) {
      const remote = await importAccounts(db, client);
      const { data: accounts } = await db
        .from("social_accounts")
        .select("*")
        .eq("client_id", client.id)
        .eq("source", "bundle")
        .eq("is_active", true);

      for (const account of accounts ?? []) {
        const bundleType = remote.find((r) => r.id === account.bundle_account_id)?.type;
        if (!bundleType) continue;

        const fresh = account.last_synced_at &&
          Date.now() - new Date(account.last_synced_at).getTime() < FRESH_MS;
        if (fresh && !force) {
          results.push({ accountId: account.id, provider: account.provider, ok: true, skipped: "fresh" });
          continue;
        }

        results.push(
          await syncAccount(db, { ...account, bundle_type: bundleType }, { force, jobType }),
        );
      }
    }

    return json({ synced: results });
  } catch (error) {
    console.error("bundle-sync error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
