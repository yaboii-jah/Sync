import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type QueryClient = SupabaseClient<Database>;

export interface SpeakerLite {
  id: string;
  name: string;
  role: string;
  organization: string | null;
}

export interface EventInfo {
  id: string;
  name: string;
  venue: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface SessionWithSpeakers {
  id: string;
  title: string;
  description: string | null;
  room: string | null;
  start_time: string;
  end_time: string;
  status: string;
  speakers: SpeakerLite[];
}

interface SessionRow {
  id: string;
  title: string;
  description: string | null;
  room: string | null;
  start_time: string;
  end_time: string;
  status: string;
  session_speakers: { speakers_sponsors: SpeakerLite }[];
}

function toSessionWithSpeakers(row: SessionRow): SessionWithSpeakers {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    room: row.room,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    speakers: row.session_speakers.map((link) => link.speakers_sponsors),
  };
}

export async function getEvent(
  client: QueryClient,
): Promise<EventInfo | null> {
  const { data } = await client
    .from("events")
    .select("id, name, venue, starts_at, ends_at, status")
    .order("starts_at")
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function getSessionsWithSpeakers(
  client: QueryClient,
): Promise<SessionWithSpeakers[]> {
  const { data } = await client
    .from("sessions")
    .select(
      "id, title, description, room, start_time, end_time, status, session_speakers(speakers_sponsors(id, name, role, organization))",
    )
    .order("start_time", { ascending: true });

  if (!data) return [];

  return (data as unknown as SessionRow[]).map(toSessionWithSpeakers);
}

export async function getBookmarkedSessionIds(
  client: QueryClient,
): Promise<string[]> {
  const { data } = await client.from("my_flow_bookmarks").select("session_id");

  return (data ?? []).map((row) => row.session_id);
}
