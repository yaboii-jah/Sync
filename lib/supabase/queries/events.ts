import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveEventPermissions, EVENT_LIFECYCLES, EVENT_ROLES, EVENT_THEME_PRESETS, MEMBERSHIP_STATUSES, type EventContext, type EventPermissions, type EventRole, type MembershipStatus } from "@/lib/events/types";
import { normalizeEventSlug } from "@/lib/events/routing";
import type { Database } from "../database.types";

type QueryClient = SupabaseClient<Database>;

export interface UserEvent extends EventContext {
  role: EventRole;
  membershipStatus: MembershipStatus;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  description: string | null;
}

export interface EventAccess {
  event: UserEvent;
  permissions: EventPermissions;
}

export interface PublicEventProgram {
  event: {
    id: string; slug: string; name: string; description: string | null;
    venue: string | null; starts_at: string; ends_at: string; timezone: string;
    theme_preset: string; accent_color: string; logo_path: string | null; cover_path: string | null;
  };
  sessions: Array<{
    id: string; title: string; description: string | null; room: string | null;
    start_time: string; end_time: string; status: string; speaker_ids: string[];
  }>;
  speakers: Array<{
    id: string; name: string; photo_url: string | null; role: string;
    organization: string | null; bio: string | null; linkedin_url: string | null;
  }>;
}

const includes = <T extends readonly string[]>(values: T, value: string): value is T[number] =>
  values.includes(value);

function toUserEvent(
  event: Database["public"]["Tables"]["events"]["Row"],
  role: string,
  status: string,
): UserEvent | null {
  if (!includes(EVENT_LIFECYCLES, event.lifecycle) || !includes(EVENT_THEME_PRESETS, event.theme_preset)) return null;
  if (!includes(EVENT_ROLES, role) || !includes(MEMBERSHIP_STATUSES, status)) return null;
  return {
    id: event.id, slug: event.slug, name: event.name, lifecycle: event.lifecycle,
    isSuspended: event.suspended_at !== null, timezone: event.timezone,
    themePreset: event.theme_preset, accentColor: event.accent_color,
    role, membershipStatus: status, startsAt: event.starts_at,
    endsAt: event.ends_at, venue: event.venue, description: event.description,
  };
}

export async function getUserEvents(client: QueryClient, userId: string): Promise<UserEvent[]> {
  const memberships = await client.from("event_memberships").select("event_id, role, status").eq("user_id", userId);
  if (memberships.error) throw memberships.error;
  if (!memberships.data?.length) return [];

  const eventIds = [...new Set(memberships.data.map((row) => row.event_id))];
  const events = await client.from("events").select("*").in("id", eventIds);
  if (events.error) throw events.error;
  const byId = new Map((events.data ?? []).map((event) => [event.id, event]));

  return memberships.data.flatMap((membership) => {
    const event = byId.get(membership.event_id);
    const normalized = event && toUserEvent(event, membership.role, membership.status);
    return normalized ? [normalized] : [];
  }).sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

export async function getEventAccessBySlug(client: QueryClient, userId: string, rawSlug: string): Promise<EventAccess | null> {
  const slug = normalizeEventSlug(rawSlug);
  if (!slug) return null;
  const eventResult = await client.from("events").select("*").eq("slug", slug).maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) return null;
  const membershipResult = await client.from("event_memberships").select("role, status").eq("event_id", eventResult.data.id).eq("user_id", userId).maybeSingle();
  if (membershipResult.error) throw membershipResult.error;
  if (!membershipResult.data) return null;
  const event = toUserEvent(eventResult.data, membershipResult.data.role, membershipResult.data.status);
  if (!event) return null;
  return { event, permissions: deriveEventPermissions(event.role, event.membershipStatus, event.lifecycle, event.isSuspended) };
}

export async function getEventMembership(client: QueryClient, eventId: string, userId: string) {
  const result = await client.from("event_memberships").select("role, status").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (result.error) throw result.error;
  return result.data ?? null;
}

export async function getPublicEventProgram(client: QueryClient, rawSlug: string): Promise<PublicEventProgram | null> {
  const slug = normalizeEventSlug(rawSlug);
  if (!slug) return null;
  const result = await client.rpc("get_public_event_program", { event_slug: slug });
  if (result.error) throw result.error;
  return isPublicEventProgram(result.data) ? result.data : null;
}

function isPublicEventProgram(value: unknown): value is PublicEventProgram {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.event !== "object" || record.event === null || Array.isArray(record.event)) return false;
  const event = record.event as Record<string, unknown>;
  return typeof event.id === "string" && typeof event.slug === "string" && typeof event.name === "string" &&
    typeof event.starts_at === "string" && typeof event.ends_at === "string" && typeof event.timezone === "string" &&
    Array.isArray(record.sessions) && Array.isArray(record.speakers);
}
