import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { assertUsable, getProvider, providerStatus } from "../_shared/social/index.ts";
import { codeChallengeFor, generateCodeVerifier } from "../_shared/social/pkce.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!jwt) return json({ error: "Not authenticated" }, 401);

    const { data: claimsData, error: claimsError } = await admin.auth.getClaims(jwt);
    const userId = (claimsData as any)?.claims?.sub;
    if (claimsError || !userId) {
      return json({ error: "Your session has expired. Please sign in again." }, 401);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "status") {
      return json({ providers: providerStatus() });
    }

    const { provider: providerId, clientId, redirectUrl } = body;
    if (!providerId || !clientId || !redirectUrl) {
      return json({ error: "provider, clientId and redirectUrl are required" }, 400);
    }

    // The caller must manage (or own) this client.
    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id,organization_id")
      .eq("id", clientId)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return json({ error: "Client not found" }, 404);

    const { data: allowed } = await admin.rpc("can_access_client", {
      _client: clientId,
      _user: userId,
      _min_role: "manager",
    });
    if (!allowed) {
      return json({ error: "You do not have access to this client" }, 403);
    }

    const provider = getProvider(providerId);
    assertUsable(provider);

    const state = crypto.randomUUID();
    const codeVerifier = provider.usesPkce ? generateCodeVerifier() : "";
    const codeChallenge = provider.usesPkce ? await codeChallengeFor(codeVerifier) : "";

    const { error: stateError } = await admin.from("oauth_states").insert({
      state,
      provider: providerId,
      client_id: clientId,
      user_id: userId,
      organization_id: client.organization_id ?? null,
      code_verifier: codeVerifier,
      redirect_uri: redirectUrl,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (stateError) throw stateError;

    const authUrl = provider.getAuthUrl({ redirectUri: redirectUrl, state, codeChallenge });
    return json({ authUrl, state });
  } catch (error) {
    console.error("oauth-connect error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
