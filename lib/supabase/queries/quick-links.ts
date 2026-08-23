import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  icon: string | null;
}

export async function getQuickLinks(
  client: SupabaseClient<Database>,
): Promise<QuickLink[]> {
  const { data } = await client
    .from("quick_links")
    .select("id, label, url, icon")
    .order("created_at");

  return data ?? [];
}
