import {
  env,
  expiresAtFromSeconds,
  fetchJson,
  type AuthUrlParams,
  type ExchangeParams,
  type MetricSet,
  type PostData,
  type ProfileData,
  type SocialAccountRow,
  type SocialProvider,
  type TokenResult,
} from "./types.ts";

const SCOPES = ["tweet.read", "users.read", "offline.access"];

/**
 * X / Twitter.
 *
 * Disabled by default: the official X API is pay-per-use (post reads, user
 * reads and analytics reads are all billed), so it cannot be part of the
 * zero-cost tier. It becomes available only when the client brings their own
 * X API credentials (TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET) and the
 * X_ENABLED flag is set.
 */
export const x: SocialProvider = {
  id: "twitter",
  label: "X (Twitter)",
  enabled: (Deno.env.get("X_ENABLED") ?? "").toLowerCase() === "true",
  requiredEnv: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
  usesPkce: true,

  getAuthUrl({ redirectUri, state, codeChallenge }: AuthUrlParams) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env("TWITTER_CLIENT_ID"),
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }: ExchangeParams): Promise<TokenResult> {
    const data = await fetchJson("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${env("TWITTER_CLIENT_ID")}:${env("TWITTER_CLIENT_SECRET")}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    const me = await fetchJson(
      "https://api.x.com/2/users/me?user.fields=public_metrics,profile_image_url,description",
      { headers: { Authorization: `Bearer ${data.access_token}` } },
    );
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_at: expiresAtFromSeconds(data.expires_in),
      token_type: "Bearer",
      scopes: SCOPES,
      account_id: me.data.id,
      account_name: me.data.name,
      username: me.data.username,
      avatar_url: me.data.profile_image_url ?? null,
      profile_url: `https://x.com/${me.data.username}`,
      platform_account_type: "user",
    };
  },

  async getProfile(account: SocialAccountRow): Promise<ProfileData> {
    const me = await fetchJson(
      `https://api.x.com/2/users/${account.account_id}?user.fields=public_metrics,profile_image_url,description`,
      { headers: { Authorization: `Bearer ${account.access_token}` } },
    );
    const m = me.data.public_metrics ?? {};
    return {
      external_id: me.data.id,
      username: me.data.username,
      display_name: me.data.name,
      profile_url: `https://x.com/${me.data.username}`,
      avatar_url: me.data.profile_image_url ?? null,
      bio: me.data.description ?? null,
      followers_count: Number(m.followers_count ?? 0),
      following_count: Number(m.following_count ?? 0),
      posts_count: Number(m.tweet_count ?? 0),
      raw_data: me.data,
    };
  },

  async getPosts(): Promise<PostData[]> {
    return [];
  },

  async getProfileMetrics(): Promise<MetricSet> {
    return { raw_data: null };
  },
};
