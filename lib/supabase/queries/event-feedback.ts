import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { FeedbackCategory } from "@/lib/feedback";

type QueryClient = SupabaseClient<Database>;

export interface EventFeedbackEntry {
  id: string;
  category: string;
  message: string;
  attendee_name: string;
  created_at: string;
}

export interface EventRaffleSnapshot {
  attendees: { id: string; name: string }[];
  excluded_blank_count: number;
}

export interface EventRaffleAttendeeDetail { name: string; email: string | null }

export async function submitEventFeedbackEntry(client: QueryClient, input: {
  eventId: string; category: FeedbackCategory; message: string; requestId: string;
}): Promise<void> {
  const { error } = await client.rpc("submit_event_feedback", {
    target_event_id: input.eventId,
    feedback_category: input.category,
    feedback_message: input.message,
    feedback_request_id: input.requestId,
  });
  if (error) throw error;
}

export async function listEventFeedback(client: QueryClient, eventId: string): Promise<EventFeedbackEntry[]> {
  const { data, error } = await client.rpc("list_event_feedback", { target_event_id: eventId, result_limit: 100 });
  if (error) throw error;
  return data ?? [];
}

export async function getEventRaffleSnapshot(client: QueryClient, eventId: string): Promise<EventRaffleSnapshot> {
  const { data, error } = await client.rpc("get_event_raffle_attendees", { target_event_id: eventId });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Malformed raffle snapshot");
  const value = data as Record<string, unknown>;
  if (!Array.isArray(value.attendees) || !value.attendees.every((row) =>
    row && typeof row === "object" && typeof row.id === "string" && typeof row.name === "string") ||
    !Number.isInteger(value.excluded_blank_count) || (value.excluded_blank_count as number) < 0) {
    throw new Error("Malformed raffle snapshot");
  }
  return value as unknown as EventRaffleSnapshot;
}

export async function getEventRaffleAttendeeDetail(client: QueryClient, eventId: string, membershipId: string): Promise<EventRaffleAttendeeDetail | null> {
  const { data, error } = await client.rpc("get_event_raffle_attendee_detail", {
    target_event_id: eventId, target_membership_id: membershipId,
  });
  if (error) throw error;
  if (data === null) return null;
  if (typeof data !== "object" || Array.isArray(data) ||
    typeof data.name !== "string" || (data.email !== null && typeof data.email !== "string")) {
    throw new Error("Malformed raffle attendee detail");
  }
  return data as unknown as EventRaffleAttendeeDetail;
}
