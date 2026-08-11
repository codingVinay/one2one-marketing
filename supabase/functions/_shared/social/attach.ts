import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import type { TokenResult } from "./types.ts";

export interface AttachParams {
  provider: string;
  clientId: string;
  connectedByUserId: string | null;
  token: TokenResult;
}

/**
 * Attach one platform account to a client.
 * A given (provider, account_id) can only ever belong to one client — attaching
 * it elsewhere is rejected so two clients never report the same numbers.
 */
export async function attachAccount(
  db: SupabaseClient,
  { provider, clientId, connectedByUserId, token }: AttachParams,
): Promise<{ id: string }> {
  const { data: existing, error: existingError } = await db
    .from("social_accounts")
    .select("id,client_id,is_active")
    .eq("provider", provider)
    .eq("account_id", token.account_id)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing && existing.client_id !== clientId) {
    const { data: owner } = await db
      .from("clients")
      .select("name")
      .eq("id", existing.client_id)
      .maybeSingle();
    throw new Error(
      `This ${provider} account is already connected to ${owner?.name ?? "another client"}. Disconnect it there first.`,
    );
  }

  const row = {
    connected_by_user_id: connectedByUserId,
    client_id: clientId,
    provider,
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
  } as Record<string, unknown>;

  if (existing) {
    const { error } = await db.from("social_accounts").update(row).eq("id", existing.id);
    if (error) throw error;
    return { id: existing.id };
  }

  const { data, error } = await db
    .from("social_accounts")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Fire-and-forget initial sync for a freshly attached account. */
export function enqueueInitialSync(accountId: string) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-sync`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ socialAccountId: accountId, jobType: "initial" }),
  }).catch((error) => console.error("Failed to enqueue initial sync:", error));
}
