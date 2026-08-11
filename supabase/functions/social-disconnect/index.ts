import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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

    const { socialAccountId } = await req.json();
    if (!socialAccountId) return json({ error: "socialAccountId is required" }, 400);

    const { data: account, error: accountError } = await admin
      .from("social_accounts")
      .select("id,client_id")
      .eq("id", socialAccountId)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account) return json({ error: "Account not found" }, 404);

    const { data: allowed } = await admin.rpc("can_access_client", {
      _client: account.client_id,
      _user: callerId,
      _min_role: "manager",
    });
    if (!allowed) {
      return json({ error: "You do not have access to this account" }, 403);
    }

    // Revoke the stored credentials; historical metrics stay for reporting.
    const { error: updateError } = await admin
      .from("social_accounts")
      .update({
        is_active: false,
        access_token: "",
        refresh_token: null,
        sync_status: "disconnected",
        sync_error: null,
      })
      .eq("id", socialAccountId);
    if (updateError) throw updateError;

    return json({ success: true });
  } catch (error) {
    console.error("social-disconnect error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
