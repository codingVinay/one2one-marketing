import {
  engagementRate,
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

const API = "https://api.linkedin.com/rest";
const VERSION = "202411";

// Basic sign-in scopes are open; analytics scopes require LinkedIn approval
// (Community Management API). We request what we can and degrade gracefully.
const SCOPES = ["openid", "profile", "email", "w_member_social", "r_organization_social", "rw_organization_admin"];

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

export const linkedin: SocialProvider = {
  id: "linkedin",
  label: "LinkedIn",
  enabled: true,
  requiredEnv: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  usesPkce: false,

  getAuthUrl({ redirectUri, state }: AuthUrlParams) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env("LINKEDIN_CLIENT_ID"),
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  },

  async exchangeCode({ code, redirectUri }: ExchangeParams): Promise<TokenResult> {
    const data = await fetchJson("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env("LINKEDIN_CLIENT_ID"),
        client_secret: env("LINKEDIN_CLIENT_SECRET"),
      }),
    });

    const me = await fetchJson("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_at: expiresAtFromSeconds(data.expires_in),
      token_type: "Bearer",
      scopes: SCOPES,
      account_id: me.sub,
      account_name: me.name ?? null,
      username: me.given_name ?? null,
      avatar_url: me.picture ?? null,
      profile_url: "https://www.linkedin.com/in/me",
      platform_account_type: "member",
    };
  },

  async getProfile(account: SocialAccountRow): Promise<ProfileData> {
    const me = await fetchJson("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${account.access_token}` },
    });
    let followers = 0;
    try {
      const orgs = await fetchJson(
        `${API}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
        { headers: headers(account.access_token) },
      );
      const orgUrn = orgs.elements?.[0]?.organization;
      if (orgUrn) {
        const stats = await fetchJson(
          `${API}/networkSizes/${encodeURIComponent(orgUrn)}?edgeType=CompanyFollowedByMember`,
          { headers: headers(account.access_token) },
        );
        followers = Number(stats.firstDegreeSize ?? 0);
      }
    } catch (error) {
      console.warn("LinkedIn organization data unavailable:", (error as Error).message);
    }
    return {
      external_id: me.sub,
      username: me.given_name ?? null,
      display_name: me.name ?? null,
      profile_url: "https://www.linkedin.com/in/me",
      avatar_url: me.picture ?? null,
      followers_count: followers,
      raw_data: me,
    };
  },

  async getPosts(account: SocialAccountRow, { limit }: { limit: number }): Promise<PostData[]> {
    try {
      const author = `urn:li:person:${account.account_id}`;
      const data = await fetchJson(
        `${API}/posts?author=${encodeURIComponent(author)}&q=author&count=${Math.min(limit, 50)}&sortBy=LAST_MODIFIED`,
        { headers: headers(account.access_token) },
      );
      return (data.elements ?? []).map((p: any) => ({
        external_post_id: p.id,
        post_url: `https://www.linkedin.com/feed/update/${p.id}`,
        content: p.commentary ?? null,
        media_type: p.content ? "media" : "text",
        published_at: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        raw_data: p,
      })) as PostData[];
    } catch (error) {
      console.warn("LinkedIn posts unavailable (approval required):", (error as Error).message);
      return [];
    }
  },

  async getPostMetrics(account: SocialAccountRow, post: PostData): Promise<MetricSet> {
    try {
      const urn = encodeURIComponent(post.external_post_id);
      const social = await fetchJson(`${API}/socialActions/${urn}`, {
        headers: headers(account.access_token),
      });
      const likes = Number(social.likesSummary?.totalLikes ?? 0);
      const comments = Number(social.commentsSummary?.totalFirstLevelComments ?? 0);
      return {
        likes,
        comments,
        ...engagementRate(likes + comments, null, "impressions"),
        raw_data: social,
      };
    } catch (error) {
      console.warn("LinkedIn post analytics unavailable:", (error as Error).message);
      return { raw_data: null };
    }
  },

  async getProfileMetrics(): Promise<MetricSet> {
    return { raw_data: null };
  },
};
