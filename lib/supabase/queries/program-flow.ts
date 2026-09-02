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
  status_override: string | null;
  status_override_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  published: boolean;
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
  status_override: string | null;
  status_override_at: string | null;
  actual_started_at: string | null;
  actual_ended_at: string | null;
  published: boolean;
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
    status_override: row.status_override,
    status_override_at: row.status_override_at,
    actual_started_at: row.actual_started_at,
    actual_ended_at: row.actual_ended_at,
    published: row.published,
    speakers: row.session_speakers.map((link) => link.speakers_sponsors),
  };
}

export async function getEvent(
  client: QueryClient,
): Promise<EventInfo | null> {
  const { data, error } = await client
    .from("events")
    .select("id, name, venue, starts_at, ends_at, status")
    .order("starts_at")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function getSessionsWithSpeakers(
  client: QueryClient,
): Promise<SessionWithSpeakers[]> {
  const { data, error } = await client
    .from("sessions")
    .select(
      "id, title, description, room, start_time, end_time, status, status_override, status_override_at, actual_started_at, actual_ended_at, published, session_speakers(speakers_sponsors(id, name, role, organization))",
    )
    .order("start_time", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return (data as unknown as SessionRow[]).map(toSessionWithSpeakers);
}

export async function getSessionById(
  client: QueryClient,
  sessionId: string,
): Promise<SessionWithSpeakers | null> {
  const { data, error } = await client
    .from("sessions")
    .select(
      "id, title, description, room, start_time, end_time, status, status_override, status_override_at, actual_started_at, actual_ended_at, published, session_speakers(speakers_sponsors(id, name, role, organization))",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toSessionWithSpeakers(data as unknown as SessionRow);
}

export async function getBookmarkedSessionIds(
  client: QueryClient,
): Promise<string[]> {
  const { data, error } = await client.from("my_flow_bookmarks").select("session_id");

  if (error) throw error;
  return (data ?? []).map((row) => row.session_id);
}
