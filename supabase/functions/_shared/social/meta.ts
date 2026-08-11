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

const GRAPH = "https://graph.facebook.com/v21.0";

const COMMON_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "business_management",
];

const IG_SCOPES = [
  ...COMMON_SCOPES,
  "instagram_basic",
  "instagram_manage_insights",
];

function authUrl(scopes: string[], { redirectUri, state }: AuthUrlParams) {
  const params = new URLSearchParams({
    client_id: env("FACEBOOK_CLIENT_ID"),
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

async function exchangeUserToken(code: string, redirectUri: string) {
  const short = await fetchJson(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: env("FACEBOOK_CLIENT_ID"),
        client_secret: env("FACEBOOK_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        code,
      }),
  );
  // Upgrade to a long-lived (~60 day) user token.
  const long = await fetchJson(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: env("FACEBOOK_CLIENT_ID"),
        client_secret: env("FACEBOOK_CLIENT_SECRET"),
        fb_exchange_token: short.access_token,
      }),
  ).catch(() => short);
  return long;
}

const PAGE_FIELDS =
  "id,name,username,access_token,followers_count,fan_count,picture,link,instagram_business_account{id,username,name,profile_picture_url,followers_count}";

/** Every Page the login administers, following Graph paging. */
async function listPages(userToken: string): Promise<any[]> {
  let url = `${GRAPH}/me/accounts?fields=${PAGE_FIELDS}&limit=100&access_token=${userToken}`;
  const pages: any[] = [];
  for (let i = 0; i < 10 && url; i++) {
    const data = await fetchJson(url);
    pages.push(...(data.data ?? []));
    url = data.paging?.next ?? "";
  }
  return pages;
}

async function firstPage(userToken: string) {
  const page = (await listPages(userToken))[0];
  if (!page) throw new Error("No Facebook Page found. A Page admin role is required.");
  return page;
}

const LONG_LIVED = () => new Date(Date.now() + 60 * 86400000).toISOString();


/** Facebook Page provider */
export const facebook: SocialProvider = {
  id: "facebook",
  label: "Facebook Page",
  enabled: true,
  requiredEnv: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
  usesPkce: false,
  supportsMultipleAccounts: true,

  getAuthUrl: (p) => authUrl(COMMON_SCOPES, p),

  async exchangeUserCode({ code, redirectUri }: ExchangeParams) {
    const user = await exchangeUserToken(code, redirectUri);
    return { access_token: user.access_token as string };
  },

  async listCandidates(userAccessToken: string) {
    const pages = await listPages(userAccessToken);
    if (!pages.length) throw new Error("No Facebook Page found. A Page admin role is required.");
    return pages.map((page) => ({
      access_token: page.access_token,
      refresh_token: null,
      expires_at: LONG_LIVED(),
      token_type: "Bearer",
      scopes: COMMON_SCOPES,
      account_id: page.id,
      account_name: page.name,
      username: page.username ?? null,
      avatar_url: page.picture?.data?.url ?? null,
      profile_url: page.link ?? `https://facebook.com/${page.id}`,
      platform_account_type: "page",
      description: page.followers_count || page.fan_count
        ? `${Number(page.followers_count ?? page.fan_count).toLocaleString()} followers`
        : null,
    }));
  },

  async exchangeCode({ code, redirectUri }: ExchangeParams): Promise<TokenResult> {
    const user = await exchangeUserToken(code, redirectUri);
    const page = await firstPage(user.access_token);
    return {
      access_token: page.access_token, // page tokens are long-lived
      refresh_token: null,
      expires_at: expiresAtFromSeconds(user.expires_in) ?? LONG_LIVED(),
      token_type: "Bearer",
      scopes: COMMON_SCOPES,
      account_id: page.id,
      account_name: page.name,
      username: page.username ?? null,
      avatar_url: page.picture?.data?.url ?? null,
      profile_url: page.link ?? `https://facebook.com/${page.id}`,
      platform_account_type: "page",
    };
  },

  async getProfile(account: SocialAccountRow): Promise<ProfileData> {
    const page = await fetchJson(
      `${GRAPH}/${account.account_id}?fields=id,name,username,about,fan_count,followers_count,picture,link&access_token=${account.access_token}`,
    );
    return {
      external_id: page.id,
      username: page.username ?? null,
      display_name: page.name ?? null,
      profile_url: page.link ?? null,
      avatar_url: page.picture?.data?.url ?? null,
      bio: page.about ?? null,
      followers_count: Number(page.followers_count ?? page.fan_count ?? 0),
      following_count: 0,
      posts_count: 0,
      raw_data: page,
    };
  },

  async getPosts(account: SocialAccountRow, { limit }: { limit: number }): Promise<PostData[]> {
    const data = await fetchJson(
      `${GRAPH}/${account.account_id}/posts?fields=id,message,permalink_url,created_time,full_picture,` +
        `shares,likes.summary(true),comments.summary(true),insights.metric(post_impressions,post_impressions_unique)` +
        `&limit=${Math.min(limit, 100)}&access_token=${account.access_token}`,
    );
    return (data.data ?? []).map((p: any) => {
      const likes = Number(p.likes?.summary?.total_count ?? 0);
      const comments = Number(p.comments?.summary?.total_count ?? 0);
      const shares = Number(p.shares?.count ?? 0);
      const insights = Object.fromEntries(
        (p.insights?.data ?? []).map((i: any) => [i.name, i.values?.[0]?.value ?? 0]),
      );
      const reach = Number(insights.post_impressions_unique ?? 0);
      const impressions = Number(insights.post_impressions ?? 0);
      return {
        external_post_id: p.id,
        post_url: p.permalink_url ?? null,
        content: p.message ?? null,
        media_type: p.full_picture ? "image" : "status",
        thumbnail_url: p.full_picture ?? null,
        published_at: p.created_time ?? null,
        likes,
        comments,
        shares,
        reach,
        impressions,
        ...engagementRate(likes + comments + shares, reach || impressions, reach ? "reach" : "impressions"),
        raw_data: p,
      } as PostData;
    });
  },

  async getProfileMetrics(account: SocialAccountRow): Promise<MetricSet> {
    try {
      const data = await fetchJson(
        `${GRAPH}/${account.account_id}/insights?metric=page_impressions,page_impressions_unique,page_post_engagements` +
          `&period=day&date_preset=last_30d&access_token=${account.access_token}`,
      );
      const totals: Record<string, number> = {};
      for (const m of data.data ?? []) {
        totals[m.name] = (m.values ?? []).reduce((s: number, v: any) => s + Number(v.value ?? 0), 0);
      }
      const reach = totals.page_impressions_unique ?? null;
      return {
        impressions: totals.page_impressions ?? null,
        reach,
        ...engagementRate(totals.page_post_engagements ?? 0, reach, "reach"),
        raw_data: data,
      };
    } catch (error) {
      console.warn("Facebook page insights unavailable:", (error as Error).message);
      return { raw_data: null };
    }
  },
};

/** Instagram professional account, connected through the same Meta login */
export const instagram: SocialProvider = {
  id: "instagram",
  label: "Instagram",
  enabled: true,
  requiredEnv: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
  usesPkce: false,

  getAuthUrl: (p) => authUrl(IG_SCOPES, p),

  async exchangeCode({ code, redirectUri }: ExchangeParams): Promise<TokenResult> {
    const user = await exchangeUserToken(code, redirectUri);
    const page = await firstPage(user.access_token);
    const igId = page.instagram_business_account?.id;
    if (!igId) {
      throw new Error(
        "No Instagram professional account is linked to your Facebook Page. Link it in Meta Business settings and try again.",
      );
    }
    const ig = await fetchJson(
      `${GRAPH}/${igId}?fields=id,username,name,profile_picture_url&access_token=${page.access_token}`,
    );
    return {
      access_token: page.access_token,
      refresh_token: null,
      expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      token_type: "Bearer",
      scopes: IG_SCOPES,
      account_id: ig.id,
      account_name: ig.name ?? ig.username,
      username: ig.username ?? null,
      avatar_url: ig.profile_picture_url ?? null,
      profile_url: ig.username ? `https://instagram.com/${ig.username}` : null,
      platform_account_type: "professional",
    };
  },

  async getProfile(account: SocialAccountRow): Promise<ProfileData> {
    const ig = await fetchJson(
      `${GRAPH}/${account.account_id}?fields=id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url&access_token=${account.access_token}`,
    );
    return {
      external_id: ig.id,
      username: ig.username ?? null,
      display_name: ig.name ?? ig.username ?? null,
      profile_url: ig.username ? `https://instagram.com/${ig.username}` : null,
      avatar_url: ig.profile_picture_url ?? null,
      bio: ig.biography ?? null,
      followers_count: Number(ig.followers_count ?? 0),
      following_count: Number(ig.follows_count ?? 0),
      posts_count: Number(ig.media_count ?? 0),
      raw_data: ig,
    };
  },

  async getPosts(account: SocialAccountRow, { limit }: { limit: number }): Promise<PostData[]> {
    const data = await fetchJson(
      `${GRAPH}/${account.account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,` +
        `like_count,comments_count&limit=${Math.min(limit, 100)}&access_token=${account.access_token}`,
    );
    const posts: PostData[] = [];
    for (const m of data.data ?? []) {
      const likes = Number(m.like_count ?? 0);
      const comments = Number(m.comments_count ?? 0);
      let reach = 0;
      let impressions = 0;
      let saves = 0;
      let shares = 0;
      try {
        const metricNames = m.media_type === "VIDEO" || m.media_type === "REELS"
          ? "reach,saved,shares,views"
          : "reach,saved,shares";
        const ins = await fetchJson(
          `${GRAPH}/${m.id}/insights?metric=${metricNames}&access_token=${account.access_token}`,
        );
        for (const i of ins.data ?? []) {
          const value = Number(i.values?.[0]?.value ?? 0);
          if (i.name === "reach") reach = value;
          if (i.name === "saved") saves = value;
          if (i.name === "shares") shares = value;
          if (i.name === "views") impressions = value;
        }
      } catch (error) {
        console.warn(`IG insights unavailable for ${m.id}:`, (error as Error).message);
      }
      posts.push({
        external_post_id: m.id,
        post_url: m.permalink ?? null,
        content: m.caption ?? null,
        media_type: (m.media_type ?? "").toLowerCase() || null,
        thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
        published_at: m.timestamp ?? null,
        likes,
        comments,
        saves,
        shares,
        reach,
        impressions,
        views: impressions,
        ...engagementRate(likes + comments + saves + shares, reach || impressions, reach ? "reach" : "impressions"),
        raw_data: m,
      });
    }
    return posts;
  },

  async getProfileMetrics(account: SocialAccountRow): Promise<MetricSet> {
    try {
      const since = Math.floor((Date.now() - 29 * 86400000) / 1000);
      const until = Math.floor(Date.now() / 1000);
      const data = await fetchJson(
        `${GRAPH}/${account.account_id}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${account.access_token}`,
      );
      const reach = (data.data?.[0]?.values ?? []).reduce(
        (s: number, v: any) => s + Number(v.value ?? 0),
        0,
      );
      return { reach: reach || null, raw_data: data };
    } catch (error) {
      console.warn("Instagram insights unavailable:", (error as Error).message);
      return { raw_data: null };
    }
  },
};
