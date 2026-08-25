import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export async function getLastReadAt(
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const { data } = await client
    .from("alert_read_state")
    .select("last_read_at")
    .maybeSingle();

  return data?.last_read_at ?? null;
}

export async function getUnreadAlertCount(
  client: SupabaseClient<Database>,
): Promise<number> {
  const lastReadAt = await getLastReadAt(client);

  let query = client
    .from("notifications")
    .select("id", { count: "exact", head: true });

  if (lastReadAt) query = query.gt("created_at", lastReadAt);

  const { count } = await query;
  return count ?? 0;
}

export async function markAlertsRead(
  client: SupabaseClient<Database>,
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client.from("alert_read_state").upsert({
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  });

  if (error) console.error("[alerts] mark-read failed:", error.message);
}
