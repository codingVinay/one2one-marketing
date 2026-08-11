import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { attachAccount, enqueueInitialSync } from "../_shared/social/attach.ts";
import type { AccountCandidate } from "../_shared/social/types.ts";

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

    const { data: claims, error: claimsError } = await admin.auth.getClaims(jwt);
    const callerId = (claims as any)?.claims?.sub;
    if (claimsError || !callerId) {
      return json({ error: "Your session has expired. Please sign in again." }, 401);
    }

    const { pendingId, accountIds } = await req.json();
    if (!pendingId || !Array.isArray(accountIds) || accountIds.length === 0) {
      return json({ error: "pendingId and accountIds are required" }, 400);
    }

    const { data: pending, error: pendingError } = await admin
      .from("pending_social_connections")
      .select("*")
      .eq("id", pendingId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (!pending) return json({ error: "This selection has expired. Please connect again." }, 400);

    const { data: allowed } = await admin.rpc("can_access_client", {
      _client: pending.client_id,
      _user: callerId,
      _min_role: "manager",
    });
    if (!allowed) return json({ error: "You do not have access to this client" }, 403);

    const candidates = (pending.candidates ?? []) as AccountCandidate[];
    const results: Array<{ account_id: string; ok: boolean; error?: string }> = [];

    for (const accountId of accountIds) {
      const candidate = candidates.find((c) => c.account_id === accountId);
      if (!candidate) {
        results.push({ account_id: accountId, ok: false, error: "Unknown account" });
        continue;
      }
      try {
        const account = await attachAccount(admin, {
          provider: pending.provider,
          clientId: pending.client_id,
          connectedByUserId: pending.connected_by_user_id,
          token: candidate,
        });
        enqueueInitialSync(account.id);
        results.push({ account_id: accountId, ok: true });
      } catch (error) {
        results.push({ account_id: accountId, ok: false, error: (error as Error).message });
      }
    }

    await admin.from("pending_social_connections").delete().eq("id", pendingId);
    await admin
      .from("pending_social_connections")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return json({ success: results.some((r) => r.ok), results });
  } catch (error) {
    console.error("social-attach error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
