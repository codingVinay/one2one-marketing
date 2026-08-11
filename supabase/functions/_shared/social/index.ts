import { facebook, instagram } from "./meta.ts";
import { linkedin } from "./linkedin.ts";
import { youtube } from "./youtube.ts";
import { x } from "./x.ts";
import { isConfigured, type SocialProvider } from "./types.ts";

export const providers: Record<string, SocialProvider> = {
  youtube,
  facebook,
  instagram,
  linkedin,
  twitter: x,
};

export function getProvider(id: string): SocialProvider {
  const provider = providers[id];
  if (!provider) throw new Error(`Unsupported provider: ${id}`);
  return provider;
}

export function assertUsable(provider: SocialProvider) {
  if (!provider.enabled) {
    throw new Error(
      `${provider.label} is not available: its API is pay-per-use and is disabled in this workspace.`,
    );
  }
  if (!isConfigured(provider)) {
    throw new Error(
      `${provider.label} is not configured. Missing credentials: ${provider.requiredEnv.join(", ")}.`,
    );
  }
}

export function providerStatus() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    label: p.label,
    enabled: p.enabled,
    configured: isConfigured(p),
  }));
}

export * from "./types.ts";
