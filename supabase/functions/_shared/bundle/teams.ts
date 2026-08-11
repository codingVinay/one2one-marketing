import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { bundleFetch } from "./client.ts";

/**
 * Every client maps to one bundle.social team ("workspace per customer"),
 * which keeps their social accounts and daily posting quotas isolated.
 */
export async function ensureTeam(
  db: SupabaseClient,
  client: { id: string; name: string; bundle_team_id: string | null },
): Promise<string> {
  if (client.bundle_team_id) {
    try {
      await bundleFetch({ path: `/team/${client.bundle_team_id}` });
      return client.bundle_team_id;
    } catch (error) {
      console.warn(`Stored bundle team is unusable, recreating:`, (error as Error).message);
    }
  }

  const name = `${client.name}`.trim().slice(0, 80).padEnd(3, " ");
  const team = await bundleFetch<{ id: string }>({
    method: "POST",
    path: "/team/",
    body: { name },
  });

  const { error } = await db
    .from("clients")
    .update({ bundle_team_id: team.id })
    .eq("id", client.id);
  if (error) throw error;

  return team.id;
}
