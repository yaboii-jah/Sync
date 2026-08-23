import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_session_id: string | null;
  created_at: string;
}

export async function getNotifications(
  client: SupabaseClient<Database>,
  limit = 50,
): Promise<NotificationRow[]> {
  const { data } = await client
    .from("notifications")
    .select("id, type, title, body, related_session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
