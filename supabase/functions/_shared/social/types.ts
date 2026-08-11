// Shared types for the social ingestion layer.

export interface SocialAccountRow {
  id: string;
  client_id: string;
  user_id: string;
  provider: string;
  account_id: string;
  account_name: string | null;
  username: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  token_type: string | null;
  platform_account_type: string | null;
  scopes: string[] | null;
  is_active: boolean;
  last_synced_at: string | null;
  raw_meta?: Record<string, unknown> | null;
}

export interface TokenResult {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  token_type?: string | null;
  scopes?: string[];
  account_id: string;
  account_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  profile_url?: string | null;
  platform_account_type?: string | null;
}

export interface ProfileData {
  external_id: string;
  username?: string | null;
  display_name?: string | null;
  profile_url?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  raw_data?: unknown;
}

export interface MetricSet {
  impressions?: number | null;
  reach?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  engagement_rate?: number | null;
  engagement_rate_basis?: string | null;
  raw_data?: unknown;
}

export interface PostData extends MetricSet {
  external_post_id: string;
  post_url?: string | null;
  content?: string | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  published_at?: string | null;
}

export interface AuthUrlParams {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export interface ExchangeParams {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}

export interface SocialProvider {
  id: string;
  label: string;
  /** false when the platform's API is not usable at zero cost (X) */
  enabled: boolean;
  /** env var names that must be set for this provider to work */
  requiredEnv: string[];
  usesPkce: boolean;
  getAuthUrl(params: AuthUrlParams): string;
  exchangeCode(params: ExchangeParams): Promise<TokenResult>;
  refreshToken?(account: SocialAccountRow): Promise<Partial<TokenResult>>;
  getProfile(account: SocialAccountRow): Promise<ProfileData>;
  getPosts(account: SocialAccountRow, opts: { limit: number }): Promise<PostData[]>;
  getProfileMetrics(account: SocialAccountRow, profile: ProfileData): Promise<MetricSet>;
  getPostMetrics?(account: SocialAccountRow, post: PostData): Promise<MetricSet>;
}

export function env(name: string): string {
  return Deno.env.get(name) ?? "";
}

export function isConfigured(provider: SocialProvider): boolean {
  return provider.requiredEnv.every((k) => !!Deno.env.get(k));
}

export function expiresAtFromSeconds(seconds?: number): string | null {
  if (!seconds || Number.isNaN(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function engagementRate(
  interactions: number,
  basisValue: number | null | undefined,
  basis: string,
): { engagement_rate: number | null; engagement_rate_basis: string | null } {
  if (!basisValue || basisValue <= 0) {
    return { engagement_rate: null, engagement_rate_basis: null };
  }
  return {
    engagement_rate: Number(((interactions / basisValue) * 100).toFixed(2)),
    engagement_rate_basis: basis,
  };
}

export async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const message = body?.error?.message ?? body?.error_description ?? body?.error ?? text;
    throw new Error(`[${res.status}] ${typeof message === "string" ? message : JSON.stringify(message)}`);
  }
  return body;
}
