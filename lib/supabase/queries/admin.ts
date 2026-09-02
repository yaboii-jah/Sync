import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../database.types";

type QueryClient = SupabaseClient<Database>;

interface RpcError {
  message: string;
}

interface RpcClient {
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
}

export interface AdminDashboardData {
  attendee_count: number;
  push_enabled_attendees: number;
  push_device_count: number;
  override_count: number;
  failed_dispatch_count: number;
  current_session: AdminDashboardSession | null;
  next_session: AdminDashboardSession | null;
}

export interface AdminDashboardSession {
  id: string;
  title: string;
  room: string | null;
  status: string;
  status_override?: string | null;
  actual_started_at?: string | null;
  start_time: string;
  end_time: string;
}

export interface AdminAttendee {
  id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
  push_device_count: number;
}

export interface AdminNotificationSummary {
  id: string;
  type: string;
  title: string;
  body: string | null;
  source: string;
  audience_kind: string;
  created_at: string;
  recipient_count: number;
  dispatch_status: string | null;
  target_device_count: number | null;
  accepted_count: number | null;
  failed_count: number | null;
  pruned_count: number | null;
  no_subscription_count: number | null;
}

export interface AdminNotificationDetail {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    source: string;
    audience_kind: string;
    created_at: string;
  };
  dispatch: {
    status: string;
    recipient_count: number;
    target_device_count: number;
    accepted_count: number;
    failed_count: number;
    pruned_count: number;
    no_subscription_count: number;
    last_error: string | null;
    completed_at: string | null;
  } | null;
  recipients: Array<{
    id: string;
    name: string;
    push_device_count: number;
  }>;
  deliveries: Array<{
    user_id: string;
    name: string | null;
    device_id: string;
    status: string;
    status_code: number | null;
    error: string | null;
    attempted_at: string;
  }>;
}

export interface AdminAuditEntry {
  id: number;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Json;
  created_at: string;
}

export interface AdminMutationResult {
  notification_id: string;
  recipient_count: number;
  device_count: number;
}

async function callRpc<T>(
  client: QueryClient,
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const rpcClient = client as unknown as RpcClient;
  const { data, error } = await rpcClient.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function isAdmin(client: QueryClient): Promise<boolean> {
  return callRpc<boolean>(client, "current_user_is_admin");
}

export async function getAdminDashboard(
  client: QueryClient,
): Promise<AdminDashboardData> {
  return callRpc<AdminDashboardData>(client, "admin_get_dashboard");
}

export async function searchAdminAttendees(
  client: QueryClient,
  query = "",
  limit = 50,
  offset = 0,
): Promise<AdminAttendee[]> {
  return callRpc<AdminAttendee[]>(client, "admin_search_attendees", {
    search_query: query,
    result_limit: limit,
    result_offset: offset,
  });
}

export async function getAdminNotifications(
  client: QueryClient,
  limit = 50,
  offset = 0,
): Promise<AdminNotificationSummary[]> {
  return callRpc<AdminNotificationSummary[]>(client, "admin_list_notifications", {
    result_limit: limit,
    result_offset: offset,
  });
}

export async function getAdminNotification(
  client: QueryClient,
  notificationId: string,
): Promise<AdminNotificationDetail | null> {
  return callRpc<AdminNotificationDetail | null>(client, "admin_get_notification", {
    target_notification_id: notificationId,
  });
}

export async function getAdminAudit(
  client: QueryClient,
  limit = 100,
  offset = 0,
): Promise<AdminAuditEntry[]> {
  return callRpc<AdminAuditEntry[]>(client, "admin_list_audit", {
    result_limit: limit,
    result_offset: offset,
  });
}

export async function createAdminNotification(
  client: QueryClient,
  input: {
    title: string;
    body: string;
    audience: "all" | "selected";
    recipientIds: string[];
    requestId: string;
  },
): Promise<AdminMutationResult> {
  const rows = await callRpc<AdminMutationResult[]>(client, "admin_create_notification", {
    notification_title: input.title,
    notification_body: input.body,
    audience: input.audience,
    recipient_ids: input.recipientIds,
    mutation_request_id: input.requestId,
  });
  if (!rows[0]) throw new Error("Notification creation returned no result");
  return rows[0];
}

export async function setAdminSessionStatus(
  client: QueryClient,
  input: {
    sessionId: string;
    action: "start" | "end" | "resume_auto";
    sendNotification: boolean;
    requestId: string;
  },
): Promise<void> {
  await callRpc(client, "admin_set_session_status", {
    target_session_id: input.sessionId,
    action: input.action,
    send_notification: input.sendNotification,
    mutation_request_id: input.requestId,
  });
}

export async function markAlertsReadAtDatabaseTime(
  client: QueryClient,
): Promise<void> {
  await callRpc(client, "mark_alerts_read");
}

export interface AdminSessionInput {
  title: string;
  description: string;
  room: string;
  startTime: string;
  endTime: string;
  requestId: string;
}

export async function createAdminSession(
  client: QueryClient,
  input: AdminSessionInput & { eventId: string; published: boolean },
): Promise<string> {
  return callRpc(client, "admin_create_session", {
    target_event_id: input.eventId,
    session_title: input.title,
    session_description: input.description,
    session_room: input.room,
    session_start_time: input.startTime,
    session_end_time: input.endTime,
    session_published: input.published,
    mutation_request_id: input.requestId,
  }) as Promise<string>;
}

export async function updateAdminSession(
  client: QueryClient,
  input: AdminSessionInput & { sessionId: string },
): Promise<void> {
  await callRpc(client, "admin_update_session", {
    target_session_id: input.sessionId,
    session_title: input.title,
    session_description: input.description,
    session_room: input.room,
    session_start_time: input.startTime,
    session_end_time: input.endTime,
    mutation_request_id: input.requestId,
  });
}

export async function setAdminSessionPublished(
  client: QueryClient,
  input: { sessionId: string; published: boolean; requestId: string },
): Promise<void> {
  await callRpc(client, "admin_set_session_published", {
    target_session_id: input.sessionId,
    next_published: input.published,
    mutation_request_id: input.requestId,
  });
}

export async function deleteAdminSession(
  client: QueryClient,
  input: { sessionId: string; requestId: string },
): Promise<void> {
  await callRpc(client, "admin_delete_session", {
    target_session_id: input.sessionId,
    mutation_request_id: input.requestId,
  });
}
