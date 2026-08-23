import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export interface Person {
  id: string;
  name: string;
  photo_url: string | null;
  role: string;
  organization: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

export async function getSpeakersSponsors(
  client: SupabaseClient<Database>,
): Promise<Person[]> {
  const { data } = await client
    .from("speakers_sponsors")
    .select("id, name, photo_url, role, organization, bio, linkedin_url")
    .order("name");

  return data ?? [];
}
