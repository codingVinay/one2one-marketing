import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { assertUsable, getProvider } from "../_shared/social/index.ts";

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
    // Only `code` and `state` are trusted from the browser. Everything else
    // (user, client, provider, redirect_uri, PKCE verifier) comes from the
    // server-side state row created during oauth-connect.
    const { code, state } = await req.json();
    if (!code || !state) return json({ error: "code and state are required" }, 400);

    const { data: stateRow, error: stateError } = await admin
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (stateError) throw stateError;
    if (!stateRow) return json({ error: "Invalid or expired authorization state" }, 400);

    // Single-use state.
    await admin.from("oauth_states").delete().eq("state", state);

    const provider = getProvider(stateRow.provider);
    assertUsable(provider);

    const token = await provider.exchangeCode({
      code,
      redirectUri: stateRow.redirect_uri,
      codeVerifier: stateRow.code_verifier ?? "",
    });

    const { data: account, error: upsertError } = await admin
      .from("social_accounts")
      .upsert(
        {
          user_id: stateRow.user_id,
          client_id: stateRow.client_id,
          provider: stateRow.provider,
          account_id: token.account_id,
          account_name: token.account_name,
          username: token.username ?? null,
          avatar_url: token.avatar_url ?? null,
          profile_url: token.profile_url ?? null,
          platform_account_type: token.platform_account_type ?? null,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          token_type: token.token_type ?? "Bearer",
          expires_at: token.expires_at,
          scopes: token.scopes ?? null,
          is_active: true,
          sync_status: "pending",
          sync_error: null,
        },
        { onConflict: "client_id,provider,account_id" },
      )
      .select("id")
      .single();

    if (upsertError) throw upsertError;

    // Kick off the initial sync in the background — don't block the callback.
    const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-sync`;
    fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ socialAccountId: account.id, jobType: "initial" }),
    }).catch((error) => console.error("Failed to enqueue initial sync:", error));

    return json({
      success: true,
      provider: stateRow.provider,
      account: { id: account.id, name: token.account_name, username: token.username ?? null },
    });
  } catch (error) {
    console.error("oauth-callback error:", error);
    return json({ error: (error as Error).message }, 400);
  }
});
