import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export async function getLastReadAt(
  client: SupabaseClient<Database>,
  eventId?: string,
): Promise<string | null> {
  let query = client
    .from("alert_read_state")
    .select("last_read_at");
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query.maybeSingle();

  return data?.last_read_at ?? null;
}

export async function getUnreadAlertCount(
  client: SupabaseClient<Database>,
  eventId?: string,
): Promise<number> {
  const lastReadAt = await getLastReadAt(client, eventId);

  let query = client
    .from("notifications")
    .select("id", { count: "exact", head: true });

  if (lastReadAt) query = query.gt("created_at", lastReadAt);
  if (eventId) query = query.eq("event_id", eventId);

  const { count } = await query;
  return count ?? 0;
}

export async function markAlertsRead(
  client: SupabaseClient<Database>,
): Promise<void> {
  try {
    // Attendee operation, not a legacy administrative query. Keep this module
    // browser-safe and independent of the server-only global-admin boundary.
    const { error } = await client.rpc("mark_alerts_read");
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(
      "[alerts] mark-read failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function markEventAlertsRead(client: SupabaseClient<Database>, eventId: string): Promise<void> {
  const { error } = await client.rpc("mark_event_alerts_read", { target_event_id: eventId });
  if (error) throw error;
}
