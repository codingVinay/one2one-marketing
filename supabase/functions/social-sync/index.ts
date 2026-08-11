import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { assertUsable, getProvider } from "../_shared/social/index.ts";
import type { SocialAccountRow } from "../_shared/social/types.ts";
import { finishJob, saveProfile, savePosts, startJob } from "../_shared/social/store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POST_LIMIT = 25;
/** Accounts are refreshed at most once every 6 hours by the scheduled run. */
const STALE_MS = 6 * 60 * 60 * 1000;

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

async function refreshIfNeeded(db: ReturnType<typeof admin>, account: SocialAccountRow) {
  const provider = getProvider(account.provider);
  const expiresSoon = account.expires_at
    ? new Date(account.expires_at).getTime() - Date.now() < 5 * 60 * 1000
    : false;
  if (!expiresSoon || !provider.refreshToken || !account.refresh_token) return account;

  const refreshed = await provider.refreshToken(account);
  const updated = {
    access_token: refreshed.access_token ?? account.access_token,
    refresh_token: refreshed.refresh_token ?? account.refresh_token,
    expires_at: refreshed.expires_at ?? account.expires_at,
  };
  await db.from("social_accounts").update(updated).eq("id", account.id);
  return { ...account, ...updated };
}

async function syncAccount(
  db: ReturnType<typeof admin>,
  account: SocialAccountRow,
  jobType: string,
) {
  const jobId = await startJob(db, account, jobType);
  try {
    const provider = getProvider(account.provider);
    assertUsable(provider);

    const live = await refreshIfNeeded(db, account);
    const profile = await provider.getProfile(live);
    const profileMetrics = await provider.getProfileMetrics(live, profile);
    await saveProfile(db, live, profile, profileMetrics);

    const posts = await provider.getPosts(live, { limit: POST_LIMIT });
    if (provider.getPostMetrics) {
      for (const post of posts) {
        try {
          Object.assign(post, await provider.getPostMetrics(live, post));
        } catch (error) {
          console.warn(`Post metrics failed for ${post.external_post_id}:`, (error as Error).message);
        }
      }
    }
    const count = await savePosts(db, live, posts);

    await finishJob(db, jobId, account.id, { ok: true, records: count + 1 });
    return { accountId: account.id, provider: account.provider, ok: true, posts: count };
  } catch (error) {
    const message = (error as Error).message;
    console.error(`Sync failed for account ${account.id}:`, message);
    await finishJob(db, jobId, account.id, { ok: false, error: message });
    return { accountId: account.id, provider: account.provider, ok: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = admin();
  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const body = await req.json().catch(() => ({}));

    const isInternal = (!!jwt && jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ||
      (!!cronSecret && cronSecret === Deno.env.get("SOCIAL_CRON_SECRET"));
    if (!jwt && !isInternal) return json({ error: "Not authenticated" }, 401);

    let callerId: string | null = null;
    let isSuper = false;
    if (!isInternal) {
      const { data: claims, error } = await db.auth.getClaims(jwt);
      callerId = (claims as any)?.claims?.sub ?? null;
      if (error || !callerId) {
        return json({ error: "Your session has expired. Please sign in again." }, 401);
      }
      const { data } = await db.rpc("has_role", { _user_id: callerId, _role: "superuser" });
      isSuper = !!data;
    }

    let query = db
      .from("social_accounts")
      .select("*")
      .eq("is_active", true);

    if (body.socialAccountId) {
      query = query.eq("id", body.socialAccountId);
    } else if (body.clientId) {
      query = query.eq("client_id", body.clientId);
    } else if (body.scheduled) {
      query = query
        .or(`last_synced_at.is.null,last_synced_at.lt.${new Date(Date.now() - STALE_MS).toISOString()}`)
        .limit(25);
    } else {
      return json({ error: "socialAccountId, clientId or scheduled is required" }, 400);
    }

    const { data: accounts, error: accountsError } = await query;
    if (accountsError) throw accountsError;
    if (!accounts?.length) return json({ synced: [], message: "Nothing to sync" });

    // Authorize every account against the caller.
    if (!isInternal && !isSuper) {
      const clientIds = [...new Set(accounts.map((a: any) => a.client_id))];
      for (const clientId of clientIds) {
        const { data: allowed } = await db.rpc("can_access_client", {
          _client: clientId,
          _user: callerId,
          _min_role: "viewer",
        });
        if (!allowed) {
          return json({ error: "You do not have access to these accounts" }, 403);
        }
      }
    }

    const jobType = body.jobType ?? (body.scheduled ? "scheduled" : "manual");
    const results = [];
    for (const account of accounts as SocialAccountRow[]) {
      results.push(await syncAccount(db, account, jobType));
    }

    return json({ synced: results });
  } catch (error) {
    console.error("social-sync error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
