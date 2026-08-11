import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import type { MetricSet, PostData, ProfileData, SocialAccountRow } from "./types.ts";

/** Upsert the current profile snapshot and append a historical metric row. */
export async function saveProfile(
  db: SupabaseClient,
  account: SocialAccountRow,
  profile: ProfileData,
  metrics: MetricSet,
) {
  const { error: profileError } = await db.from("social_profiles").upsert(
    {
      social_account_id: account.id,
      client_id: account.client_id,
      provider: account.provider,
      external_id: profile.external_id,
      username: profile.username ?? null,
      display_name: profile.display_name ?? null,
      profile_url: profile.profile_url ?? null,
      avatar_url: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
      followers_count: profile.followers_count ?? 0,
      following_count: profile.following_count ?? 0,
      posts_count: profile.posts_count ?? 0,
      raw_data: profile.raw_data ?? null,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,external_id" },
  );
  if (profileError) throw profileError;

  const { error: metricError } = await db.from("social_profile_metrics").insert({
    social_account_id: account.id,
    client_id: account.client_id,
    provider: account.provider,
    followers: profile.followers_count ?? null,
    following: profile.following_count ?? null,
    posts_count: profile.posts_count ?? null,
    impressions: metrics.impressions ?? null,
    reach: metrics.reach ?? null,
    views: metrics.views ?? null,
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    shares: metrics.shares ?? null,
    saves: metrics.saves ?? null,
    engagement_rate: metrics.engagement_rate ?? null,
    engagement_rate_basis: metrics.engagement_rate_basis ?? null,
    raw_data: (metrics.raw_data as Record<string, unknown>) ?? null,
  });
  if (metricError) throw metricError;
}

/** Upsert posts and append a metric snapshot for each. */
export async function savePosts(
  db: SupabaseClient,
  account: SocialAccountRow,
  posts: PostData[],
): Promise<number> {
  if (posts.length === 0) return 0;

  const rows = posts.map((p) => ({
    social_account_id: account.id,
    client_id: account.client_id,
    provider: account.provider,
    external_post_id: p.external_post_id,
    post_url: p.post_url ?? null,
    content: p.content ?? null,
    media_type: p.media_type ?? null,
    thumbnail_url: p.thumbnail_url ?? null,
    published_at: p.published_at ?? null,
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    shares: p.shares ?? 0,
    saves: p.saves ?? 0,
    views: p.views ?? 0,
    impressions: p.impressions ?? 0,
    reach: p.reach ?? 0,
    engagement_rate: p.engagement_rate ?? null,
    engagement_rate_basis: p.engagement_rate_basis ?? null,
    raw_data: (p.raw_data as Record<string, unknown>) ?? null,
    last_metrics_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await db
    .from("social_posts")
    .upsert(rows, { onConflict: "provider,external_post_id" })
    .select("id,external_post_id");
  if (error) throw error;

  const idByExternal = new Map((data ?? []).map((r: any) => [r.external_post_id, r.id]));
  const metricRows = posts
    .filter((p) => idByExternal.has(p.external_post_id))
    .map((p) => ({
      social_post_id: idByExternal.get(p.external_post_id),
      client_id: account.client_id,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      saves: p.saves ?? 0,
      views: p.views ?? 0,
      impressions: p.impressions ?? 0,
      reach: p.reach ?? 0,
      engagement_rate: p.engagement_rate ?? null,
      engagement_rate_basis: p.engagement_rate_basis ?? null,
    }));

  if (metricRows.length > 0) {
    const { error: metricError } = await db.from("social_post_metrics").insert(metricRows);
    if (metricError) throw metricError;
  }

  return rows.length;
}

export async function startJob(
  db: SupabaseClient,
  account: SocialAccountRow,
  jobType: string,
): Promise<string> {
  const { data, error } = await db
    .from("social_sync_jobs")
    .insert({
      social_account_id: account.id,
      client_id: account.client_id,
      job_type: jobType,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishJob(
  db: SupabaseClient,
  jobId: string,
  accountId: string,
  result: { ok: boolean; records?: number; error?: string },
) {
  await db
    .from("social_sync_jobs")
    .update({
      status: result.ok ? "success" : "failed",
      completed_at: new Date().toISOString(),
      records_processed: result.records ?? 0,
      error_message: result.error ?? null,
    })
    .eq("id", jobId);

  await db
    .from("social_accounts")
    .update({
      sync_status: result.ok ? "synced" : "failed",
      sync_error: result.error ?? null,
      last_synced_at: result.ok ? new Date().toISOString() : undefined,
    })
    .eq("id", accountId);
}
