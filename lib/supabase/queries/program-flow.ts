import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { SessionSeats } from "@/lib/seats";

type QueryClient = SupabaseClient<Database>;

export interface SpeakerLite {
  id: string;
  name: string;
  role: string;
  organization: string | null;
}

export interface EventInfo {
  id: string;
  slug: string;
  name: string;
  theme: string;
  theme_preset: string;
  accent_color: string;
  timezone: string;
  lifecycle: string;
  venue: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

/**
 * Seat columns ride along on every session read. They are `SessionSeats`, so
 * `seatAvailability(session)` works on a session straight out of a query with
 * nothing to unpack first — and a session with no seat limit carries a null
 * capacity, which reads as "no seats to show".
 */
export interface SessionWithSpeakers extends SessionSeats {
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
  capacity: number | null;
  reserved_seats: number;
  claimed_seats: number;
  seats_closed: boolean;
  session_speakers: { speakers_sponsors: SpeakerLite }[];
}

const SESSION_SELECT =
  "id, title, description, room, start_time, end_time, status, status_override, status_override_at, actual_started_at, actual_ended_at, published, capacity, reserved_seats, claimed_seats, seats_closed, session_speakers(speakers_sponsors(id, name, role, organization))";

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
    capacity: row.capacity,
    reserved_seats: row.reserved_seats,
    claimed_seats: row.claimed_seats,
    seats_closed: row.seats_closed,
    speakers: row.session_speakers.map((link) => link.speakers_sponsors),
  };
}

export async function getEventById(
  client: QueryClient,
  eventId: string,
): Promise<EventInfo | null> {
  const { data, error } = await client
    .from("events")
    .select("id, slug, name, theme, theme_preset, accent_color, timezone, lifecycle, venue, starts_at, ends_at, status")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function getSessionsWithSpeakersInternal(
  client: QueryClient,
  eventId: string,
  publishedOnly: boolean,
): Promise<SessionWithSpeakers[]> {
  const baseQuery = client.from("sessions").select(SESSION_SELECT).eq("event_id", eventId);
  const query = publishedOnly
    ? baseQuery.eq("published", true)
    : baseQuery;
  const { data, error } = await query
    .order("start_time", { ascending: true })
    .order("end_time", { ascending: true })
    .order("title", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return (data as unknown as SessionRow[]).map(toSessionWithSpeakers);
}

/** Admin-only callers use this to retain visibility of unpublished drafts. */
export async function getSessionsWithSpeakers(
  client: QueryClient,
  eventId: string,
): Promise<SessionWithSpeakers[]> {
  return getSessionsWithSpeakersInternal(client, eventId, false);
}

/** Attendee surfaces must filter explicitly because admins can read drafts. */
export async function getPublishedSessionsWithSpeakers(
  client: QueryClient,
  eventId: string,
): Promise<SessionWithSpeakers[]> {
  return getSessionsWithSpeakersInternal(client, eventId, true);
}

async function getSessionByIdInternal(
  client: QueryClient,
  eventId: string,
  sessionId: string,
  publishedOnly: boolean,
): Promise<SessionWithSpeakers | null> {
  const baseQuery = client.from("sessions").select(SESSION_SELECT);
  const query = publishedOnly
    ? baseQuery.eq("published", true)
    : baseQuery;
  const { data, error } = await query
    .eq("event_id", eventId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toSessionWithSpeakers(data as unknown as SessionRow);
}

export async function getSessionById(
  client: QueryClient,
  eventId: string,
  sessionId: string,
): Promise<SessionWithSpeakers | null> {
  return getSessionByIdInternal(client, eventId, sessionId, false);
}

export async function getPublishedSessionById(
  client: QueryClient,
  eventId: string,
  sessionId: string,
): Promise<SessionWithSpeakers | null> {
  return getSessionByIdInternal(client, eventId, sessionId, true);
}

export async function getBookmarkedSessionIds(
  client: QueryClient,
  eventId: string,
): Promise<string[]> {
  const { data, error } = await client.from("my_flow_bookmarks").select("session_id").eq("event_id", eventId);

  if (error) throw error;
  return (data ?? []).map((row) => row.session_id);
}

/**
 * The sessions this attendee holds a seat in. RLS restricts the table to the
 * caller's own rows, so this is their seats and nobody else's — the roster of
 * a workshop is never readable from the attendee app.
 */
export async function getClaimedSessionIds(
  client: QueryClient,
  eventId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("session_seat_claims")
    .select("session_id, sessions!inner(event_id)")
    .eq("sessions.event_id", eventId);

  if (error) throw error;
  return (data ?? []).map((row) => row.session_id);
}
