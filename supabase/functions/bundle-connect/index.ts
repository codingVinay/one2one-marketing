import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  BUNDLE_PLATFORMS,
  ENABLED_BUNDLE_TYPES,
  bundleFetch,
  isBundleConfigured,
} from "../_shared/bundle/client.ts";
import { ensureTeam } from "../_shared/bundle/teams.ts";

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
    const body = await req.json().catch(() => ({}));

    if (body.action === "status") {
      return json({
        configured: isBundleConfigured(),
        platforms: BUNDLE_PLATFORMS.map((p) => ({
          type: p.type,
          provider: p.provider,
          label: p.label,
          enabled: p.enabled,
        })),
      });
    }

    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    if (!jwt) return json({ error: "Not authenticated" }, 401);

    const { data: claims, error: claimsError } = await admin.auth.getClaims(jwt);
    const callerId = (claims as any)?.claims?.sub;
    if (claimsError || !callerId) {
      return json({ error: "Your session has expired. Please sign in again." }, 401);
    }

    if (!isBundleConfigured()) {
      return json({ error: "bundle.social is not configured yet. Add the API key first." }, 400);
    }

    const { clientId, platforms, redirectUrl } = body;
    if (!clientId) return json({ error: "clientId is required" }, 400);

    const { data: allowed } = await admin.rpc("can_access_client", {
      _client: clientId,
      _user: callerId,
      _min_role: "manager",
    });
    if (!allowed) return json({ error: "You do not have access to this client" }, 403);

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id,name,bundle_team_id")
      .eq("id", clientId)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return json({ error: "Client not found" }, 404);

    const teamId = await ensureTeam(admin, client as any);

    // Only platforms we have enabled — X/Twitter can never be requested.
    const requested = Array.isArray(platforms) && platforms.length > 0
      ? platforms.map((p: string) => String(p).toUpperCase()).filter((p: string) =>
        ENABLED_BUNDLE_TYPES.includes(p as any)
      )
      : [...ENABLED_BUNDLE_TYPES];
    if (requested.length === 0) {
      return json({ error: "Select at least one available platform." }, 400);
    }

    const { url } = await bundleFetch<{ url: string }>({
      method: "POST",
      path: "/social-account/create-portal-link",
      body: {
        teamId,
        socialAccountTypes: requested,
        redirectUrl: redirectUrl ?? undefined,
        disableAutoLogin: true,
        showModalOnConnectSuccess: true,
        expiresIn: 30,
        language: "en",
      },
    });

    return json({ url, teamId, platforms: requested });
  } catch (error) {
    console.error("bundle-connect error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
