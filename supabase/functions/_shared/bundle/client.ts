// Thin client for the bundle.social API (https://info.bundle.social/api-reference).
//
// Rate-limit strategy (their documented limits are 100 req/s burst, 500 per
// 10s, 2000 per minute per endpoint): we serialise every call through a single
// queue with a minimum gap between requests, which keeps us at ~5 req/s — two
// orders of magnitude below the burst ceiling — and we honour 429 with
// exponential backoff.

export const BUNDLE_BASE_URL = "https://api.bundle.social/api/v1";

/** Platforms we expose. X/Twitter is intentionally disabled (paid API, no analytics). */
export const BUNDLE_PLATFORMS = [
  { type: "YOUTUBE", provider: "youtube", label: "YouTube", enabled: true },
  { type: "FACEBOOK", provider: "facebook", label: "Facebook Pages", enabled: true },
  { type: "INSTAGRAM", provider: "instagram", label: "Instagram", enabled: true },
  { type: "LINKEDIN", provider: "linkedin", label: "LinkedIn", enabled: true },
  { type: "TIKTOK", provider: "tiktok", label: "TikTok", enabled: true },
  { type: "THREADS", provider: "threads", label: "Threads", enabled: true },
  { type: "PINTEREST", provider: "pinterest", label: "Pinterest", enabled: true },
  { type: "TWITTER", provider: "twitter", label: "X (Twitter)", enabled: false },
] as const;

export const ENABLED_BUNDLE_TYPES = BUNDLE_PLATFORMS.filter((p) => p.enabled).map((p) => p.type);

export function providerFor(type: string): string {
  return (
    BUNDLE_PLATFORMS.find((p) => p.type === type)?.provider ?? type.toLowerCase()
  );
}

export function typeForProvider(provider: string): string | null {
  return BUNDLE_PLATFORMS.find((p) => p.provider === provider)?.type ?? null;
}

export function bundleApiKey(): string {
  return Deno.env.get("BUNDLE_SOCIAL_API_KEY") ?? "";
}

export function isBundleConfigured(): boolean {
  return !!bundleApiKey();
}

/** Minimum spacing between outbound calls (ms) → ~5 requests/second. */
const MIN_GAP_MS = 200;
let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttled<T>(run: () => Promise<T>): Promise<T> {
  const next = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return run();
  });
  // Keep the chain alive even when a call rejects.
  chain = next.catch(() => undefined);
  return next as Promise<T>;
}

export interface BundleRequest {
  method?: string;
  path: string;
  query?: Record<string, string | number | string[] | undefined>;
  body?: unknown;
}

export async function bundleFetch<T = any>({
  method = "GET",
  path,
  query,
  body,
}: BundleRequest): Promise<T> {
  const key = bundleApiKey();
  if (!key) throw new Error("bundle.social is not configured (missing BUNDLE_SOCIAL_API_KEY).");

  const url = new URL(`${BUNDLE_BASE_URL}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
    else url.searchParams.set(k, String(v));
  }

  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await throttled(() =>
      fetch(url.toString(), {
        method,
        headers: {
          "x-api-key": key,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    );

    const text = await res.text();
    let parsed: any;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (res.status === 429 && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * 2 ** attempt;
      console.warn(`bundle.social 429 on ${path}; retrying in ${delay}ms`);
      await sleep(delay);
      continue;
    }

    if (!res.ok) {
      const message = parsed?.message ?? parsed?.error ?? text ?? res.statusText;
      throw new Error(
        `[bundle.social ${res.status}] ${typeof message === "string" ? message : JSON.stringify(message)}`,
      );
    }

    return parsed as T;
  }

  throw new Error("bundle.social rate limit exceeded. Please try again in a minute.");
}
