import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../database.types";

type Client = SupabaseClient<Database>;
type NullableNumber = number | null;

export interface PlatformOverview {
  users: number; events: number; draft_events: number; published_events: number;
  archived_events: number; suspended_events: number; active_support_sessions: number;
  feedback_last_7_days: number; failed_invitation_emails_last_24_hours: number;
}
export interface PlatformEventRow {
  id: string; slug: string; name: string; lifecycle: string; starts_at: string; ends_at: string;
  timezone: string; venue: string | null; suspended_at: string | null; suspension_reason: string | null;
  updated_at: string; owner_user_id: string; owner_name: string; owner_email: string | null;
  active_members: number; active_admins: number; sessions: number;
}
export interface QuotaFields {
  active_event_limit: NullableNumber; event_admin_limit: NullableNumber;
  event_session_limit: NullableNumber; branding_upload_bytes: NullableNumber;
  quota_reason: string | null; quota_updated_at: string | null;
}
export interface PlatformEventDetail extends PlatformEventRow, QuotaFields {
  description: string | null; created_at: string; active_attendees: number; speakers: number;
  active_support_session_id: string | null; active_support_expires_at: string | null;
}
export interface PlatformUserRow extends QuotaFields {
  id: string; name: string; photo_url: string | null; email: string; email_verified: boolean;
  created_at: string; active_event_count: number; owned_event_count: number;
  administered_event_count: number; attended_event_count: number; is_super_admin: boolean;
}
export interface PlatformFeedbackRow {
  id: string; category: string; message: string; created_at: string; user_id: string;
  user_name: string; user_photo_url: string | null;
}
export interface PlatformAuditRow {
  id: number; action: string; details: Json; created_at: string; actor_user_id: string | null;
  actor_name: string; event_id: string | null; event_name: string | null;
}
export interface PlatformAttendeeRow {
  id: string; user_id: string | null; name: string; email: string | null; status: string;
  joined_at: string; ended_at: string | null;
}

const record = (value: Json | null): Record<string, Json | undefined> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json | undefined> : null;
const list = <T>(value: Json | null): T[] => Array.isArray(value) ? value as unknown as T[] : [];

export async function getPlatformOverview(client: Client): Promise<PlatformOverview> {
  const { data, error } = await client.rpc("platform_super_admin_overview");
  if (error) throw error;
  const value = record(data);
  if (!value) throw new Error("Invalid platform overview response");
  return value as unknown as PlatformOverview;
}
export async function listPlatformEvents(client: Client, input: { search?: string; lifecycle?: string | null; suspended?: boolean | null; cursorAt?: string | null; cursorId?: string | null; limit?: number } = {}) {
  const { data, error } = await client.rpc("platform_super_admin_list_events", {
    search_query: input.search ?? "", lifecycle_filter: input.lifecycle ?? undefined,
    suspended_filter: input.suspended ?? undefined, cursor_updated_at: input.cursorAt ?? undefined,
    cursor_id: input.cursorId ?? undefined, result_limit: input.limit ?? 26,
  });
  if (error) throw error; return list<PlatformEventRow>(data);
}
export async function getPlatformEvent(client: Client, id: string) {
  const { data, error } = await client.rpc("platform_super_admin_event", { target_event_id: id });
  if (error) throw error; return record(data) as unknown as PlatformEventDetail | null;
}
export async function listPlatformUsers(client: Client, input: { search?: string; cursorAt?: string | null; cursorId?: string | null; limit?: number } = {}) {
  const { data, error } = await client.rpc("platform_super_admin_list_users", { search_query: input.search ?? "", cursor_created_at: input.cursorAt ?? undefined, cursor_id: input.cursorId ?? undefined, result_limit: input.limit ?? 26 });
  if (error) throw error; return list<PlatformUserRow>(data);
}
export async function getPlatformUser(client: Client, id: string) {
  const { data, error } = await client.rpc("platform_super_admin_user", { target_user_id: id });
  if (error) throw error; return record(data) as unknown as PlatformUserRow | null;
}
export async function listPlatformFeedback(client: Client, input: { category?: string | null; cursorAt?: string | null; cursorId?: string | null; limit?: number } = {}) {
  const { data, error } = await client.rpc("platform_super_admin_list_feedback", { category_filter: input.category ?? undefined, cursor_created_at: input.cursorAt ?? undefined, cursor_id: input.cursorId ?? undefined, result_limit: input.limit ?? 26 });
  if (error) throw error; return list<PlatformFeedbackRow>(data);
}
export async function listPlatformAudit(client: Client, cursorId?: number | null, limit = 26) {
  const { data, error } = await client.rpc("platform_super_admin_list_audit", { cursor_id: cursorId ?? undefined, result_limit: limit });
  if (error) throw error; return list<PlatformAuditRow>(data);
}
export async function listPlatformAttendees(client: Client, eventId: string, input: { search?: string; status?: string | null; cursorAt?: string | null; cursorId?: string | null; limit?: number } = {}) {
  const { data, error } = await client.rpc("platform_super_admin_list_attendees", {
    target_event_id: eventId, search_query: input.search ?? "", status_filter: input.status ?? undefined,
    cursor_joined_at: input.cursorAt ?? undefined, cursor_id: input.cursorId ?? undefined, result_limit: input.limit ?? 26,
  });
  if (error) throw error; return list<PlatformAttendeeRow>(data);
}
export async function getEventBrandingUploadLimit(client: Client, eventId: string) {
  const { data, error } = await client.rpc("get_event_branding_upload_limit", { target_event_id: eventId });
  if (error) throw error; return data ?? 10 * 1024 * 1024;
}
