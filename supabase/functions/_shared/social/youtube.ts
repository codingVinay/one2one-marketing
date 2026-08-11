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

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

async function channelResource(accessToken: string) {
  const data = await fetchJson(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const item = data.items?.[0];
  if (!item) throw new Error("No YouTube channel found for this account");
  return item;
}

export const youtube: SocialProvider = {
  id: "youtube",
  label: "YouTube",
  enabled: true,
  requiredEnv: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
  usesPkce: true,

  getAuthUrl({ redirectUri, state, codeChallenge }: AuthUrlParams) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env("YOUTUBE_CLIENT_ID"),
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode({ code, redirectUri, codeVerifier }: ExchangeParams): Promise<TokenResult> {
    const data = await fetchJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env("YOUTUBE_CLIENT_ID"),
        client_secret: env("YOUTUBE_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    const channel = await channelResource(data.access_token);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_at: expiresAtFromSeconds(data.expires_in),
      token_type: data.token_type ?? "Bearer",
      scopes: SCOPES,
      account_id: channel.id,
      account_name: channel.snippet?.title ?? "YouTube Channel",
      username: channel.snippet?.customUrl ?? null,
      avatar_url: channel.snippet?.thumbnails?.default?.url ?? null,
      profile_url: `https://www.youtube.com/channel/${channel.id}`,
      platform_account_type: "channel",
    };
  },

  async refreshToken(account: SocialAccountRow) {
    if (!account.refresh_token) throw new Error("No refresh token stored for this YouTube account");
    const data = await fetchJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env("YOUTUBE_CLIENT_ID"),
        client_secret: env("YOUTUBE_CLIENT_SECRET"),
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    return {
      access_token: data.access_token,
      expires_at: expiresAtFromSeconds(data.expires_in),
    };
  },

  async getProfile(account: SocialAccountRow): Promise<ProfileData> {
    const channel = await channelResource(account.access_token);
    const stats = channel.statistics ?? {};
    return {
      external_id: channel.id,
      username: channel.snippet?.customUrl ?? null,
      display_name: channel.snippet?.title ?? null,
      profile_url: `https://www.youtube.com/channel/${channel.id}`,
      avatar_url: channel.snippet?.thumbnails?.high?.url ?? channel.snippet?.thumbnails?.default?.url ?? null,
      bio: channel.snippet?.description ?? null,
      followers_count: Number(stats.subscriberCount ?? 0),
      following_count: 0,
      posts_count: Number(stats.videoCount ?? 0),
      raw_data: channel,
    };
  },

  async getPosts(account: SocialAccountRow, { limit }: { limit: number }): Promise<PostData[]> {
    const channel = await channelResource(account.access_token);
    const uploadsId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    const headers = { Authorization: `Bearer ${account.access_token}` };
    const items: any[] = [];
    let pageToken = "";
    while (items.length < limit) {
      const page = await fetchJson(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsId}${
          pageToken ? `&pageToken=${pageToken}` : ""
        }`,
        { headers },
      );
      items.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? "";
      if (!pageToken) break;
    }

    const videoIds = items
      .slice(0, limit)
      .map((i) => i.contentDetails?.videoId)
      .filter(Boolean);
    if (videoIds.length === 0) return [];

    const posts: PostData[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50).join(",");
      const data = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch}`,
        { headers },
      );
      for (const v of data.items ?? []) {
        const stats = v.statistics ?? {};
        const likes = Number(stats.likeCount ?? 0);
        const comments = Number(stats.commentCount ?? 0);
        const views = Number(stats.viewCount ?? 0);
        posts.push({
          external_post_id: v.id,
          post_url: `https://www.youtube.com/watch?v=${v.id}`,
          content: v.snippet?.title ?? null,
          media_type: "video",
          thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
          published_at: v.snippet?.publishedAt ?? null,
          likes,
          comments,
          views,
          impressions: views,
          ...engagementRate(likes + comments, views, "views"),
          raw_data: v,
        });
      }
    }
    return posts;
  },

  async getProfileMetrics(account: SocialAccountRow): Promise<MetricSet> {
    try {
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const data = await fetchJson(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${end}` +
          `&metrics=views,likes,comments,shares,estimatedMinutesWatched,subscribersGained,subscribersLost`,
        { headers: { Authorization: `Bearer ${account.access_token}` } },
      );
      const row = data.rows?.[0] ?? [];
      const [views, likes, comments, shares] = row;
      const interactions = (likes ?? 0) + (comments ?? 0) + (shares ?? 0);
      return {
        views: views ?? null,
        likes: likes ?? null,
        comments: comments ?? null,
        shares: shares ?? null,
        ...engagementRate(interactions, views ?? null, "views"),
        raw_data: data,
      };
    } catch (error) {
      console.warn("YouTube Analytics unavailable:", (error as Error).message);
      return { raw_data: null };
    }
  },
};
