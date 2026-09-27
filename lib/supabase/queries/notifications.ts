import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface NotificationRow {
  id: string;
  event_id: string;
  type: string;
  title: string;
  body: string | null;
  related_session_id: string | null;
  created_at: string;
}

export async function getNotifications(
  client: SupabaseClient<Database>,
  limit = 50,
  eventId?: string,
): Promise<NotificationRow[]> {
  let query = client
    .from("notifications")
    .select("id, event_id, type, title, body, related_session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (eventId) query = query.eq("event_id", eventId);
  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}
