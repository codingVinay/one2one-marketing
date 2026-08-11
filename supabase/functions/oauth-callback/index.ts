import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { assertUsable, getProvider } from "../_shared/social/index.ts";
import { attachAccount, enqueueInitialSync } from "../_shared/social/attach.ts";

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

    // Providers that can expose several destinations (Meta Pages / IG accounts)
    // hand the choice back to the user instead of silently taking the first one.
    if (provider.supportsMultipleAccounts && provider.exchangeUserCode && provider.listCandidates) {
      const user = await provider.exchangeUserCode({
        code,
        redirectUri: stateRow.redirect_uri,
        codeVerifier: stateRow.code_verifier ?? "",
      });
      const candidates = await provider.listCandidates(user.access_token);

      if (candidates.length > 1) {
        const { data: pending, error: pendingError } = await admin
          .from("pending_social_connections")
          .insert({
            provider: stateRow.provider,
            client_id: stateRow.client_id,
            organization_id: stateRow.organization_id ?? null,
            connected_by_user_id: stateRow.user_id,
            user_access_token: user.access_token,
            candidates,
          })
          .select("id")
          .single();
        if (pendingError) throw pendingError;

        return json({
          success: true,
          needsSelection: true,
          pendingId: pending.id,
          provider: stateRow.provider,
          // never leak per-account tokens to the browser
          candidates: candidates.map((c) => ({
            account_id: c.account_id,
            account_name: c.account_name,
            username: c.username ?? null,
            avatar_url: c.avatar_url ?? null,
            description: c.description ?? null,
          })),
        });
      }

      const account = await attachAccount(admin, {
        provider: stateRow.provider,
        clientId: stateRow.client_id,
        connectedByUserId: stateRow.user_id,
        token: candidates[0],
      });
      enqueueInitialSync(account.id);
      return json({
        success: true,
        provider: stateRow.provider,
        account: {
          id: account.id,
          name: candidates[0].account_name,
          username: candidates[0].username ?? null,
        },
      });
    }

    const token = await provider.exchangeCode({
      code,
      redirectUri: stateRow.redirect_uri,
      codeVerifier: stateRow.code_verifier ?? "",
    });

    const account = await attachAccount(admin, {
      provider: stateRow.provider,
      clientId: stateRow.client_id,
      connectedByUserId: stateRow.user_id,
      token,
    });
    enqueueInitialSync(account.id);

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
