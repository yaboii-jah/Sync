import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { EventBasicsInput } from "@/lib/events/basics";
import type { UserEvent } from "./events";

type QueryClient = SupabaseClient<Database>;

export interface EventSetupSummary {
  sessions: number;
  publishedSessions: number;
  speakers: number;
  admins: number;
  pendingInvitations: number;
}

export async function getEventSetupSummary(client: QueryClient, event: UserEvent): Promise<EventSetupSummary | null> {
  // Suspended content is hidden by RLS; never misreport hidden rows as zero.
  if (event.isSuspended) return null;
  const results = await Promise.all([
    client.from("sessions").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    client.from("sessions").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("published", true),
    client.from("speakers_sponsors").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    client.from("event_memberships").select("id", { count: "exact", head: true }).eq("event_id", event.id).eq("role", "admin").eq("status", "active"),
    client.from("event_admin_invitations").select("id", { count: "exact", head: true }).eq("event_id", event.id).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [sessions, publishedSessions, speakers, admins, pendingInvitations] = results.map((result) => result.count ?? 0);
  return { sessions, publishedSessions, speakers, admins, pendingInvitations };
}

export async function createManagedEvent(client: QueryClient, input: EventBasicsInput, startsAt: string, endsAt: string, requestId: string) {
  const result = await client.rpc("create_event", {
    event_name: input.name.trim(), event_slug: input.slug.trim().toLowerCase(),
    event_description: input.description.trim(), event_venue: input.venue.trim(),
    event_timezone: input.timezone, event_starts_at: startsAt, event_ends_at: endsAt,
    mutation_request_id: requestId,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function updateManagedEventBasics(client: QueryClient, eventId: string, input: EventBasicsInput, startsAt: string, endsAt: string, requestId: string) {
  const result = await client.rpc("update_event_basics", {
    target_event_id: eventId, event_name: input.name.trim(),
    event_description: input.description.trim(), event_venue: input.venue.trim(),
    event_timezone: input.timezone, event_starts_at: startsAt, event_ends_at: endsAt,
    mutation_request_id: requestId,
  });
  if (result.error) throw result.error;
}
