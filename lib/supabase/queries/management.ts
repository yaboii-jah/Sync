import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { EventBasicsInput } from "@/lib/events/basics";
import type { ManagedSessionInput, ManagedSpeakerInput } from "@/lib/events/program-management";
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

export interface ManagedEventTeamMember {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: "owner" | "admin";
  joinedAt: string;
}

export interface ManagedEventInvitation {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
}

export async function getManagedEventTeam(client: QueryClient, eventId: string): Promise<{
  members: ManagedEventTeamMember[];
  invitations: ManagedEventInvitation[];
}> {
  const [members, invitations] = await Promise.all([
    client.from("event_memberships").select("id, user_id, display_name_snapshot, email_snapshot, role, joined_at")
      .eq("event_id", eventId).eq("status", "active").in("role", ["owner", "admin"]).order("role").order("joined_at").order("id"),
    client.from("event_admin_invitations").select("id, email, expires_at, created_at")
      .eq("event_id", eventId).is("accepted_at", null).is("revoked_at", null).order("created_at", { ascending: false }),
  ]);
  if (members.error) throw members.error;
  if (invitations.error) throw invitations.error;
  return {
    members: (members.data ?? []).flatMap((member) => (member.role === "owner" || member.role === "admin") ? [{
      id: member.id, userId: member.user_id, name: member.display_name_snapshot, email: member.email_snapshot,
      role: member.role, joinedAt: member.joined_at,
    }] : []),
    invitations: (invitations.data ?? []).map((invitation) => ({
      id: invitation.id, email: invitation.email, expiresAt: invitation.expires_at, createdAt: invitation.created_at,
    })),
  };
}

export interface ManagedSpeaker {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string;
  organization: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  published: boolean;
  linkedSessionIds: string[];
}

interface ManagedSpeakerRow {
  id: string;
  name: string;
  photo_url: string | null;
  role: string;
  organization: string | null;
  bio: string | null;
  linkedin_url: string | null;
  published: boolean;
  session_speakers: { session_id: string }[];
}

export async function getManagedSpeakers(client: QueryClient, eventId: string): Promise<ManagedSpeaker[]> {
  const { data, error } = await client
    .from("speakers_sponsors")
    .select("id, name, photo_url, role, organization, bio, linkedin_url, published, session_speakers(session_id)")
    .eq("event_id", eventId)
    .order("name")
    .order("id");
  if (error) throw error;
  return ((data ?? []) as unknown as ManagedSpeakerRow[]).map((speaker) => ({
    id: speaker.id,
    name: speaker.name,
    photoUrl: speaker.photo_url,
    role: speaker.role,
    organization: speaker.organization,
    bio: speaker.bio,
    linkedinUrl: speaker.linkedin_url,
    published: speaker.published,
    linkedSessionIds: speaker.session_speakers.map((link) => link.session_id),
  }));
}

export async function eventProgramEntityExists(
  client: QueryClient,
  eventId: string,
  kind: "session" | "speaker",
  entityId: string,
): Promise<boolean> {
  const table = kind === "session" ? "sessions" : "speakers_sponsors";
  const { data, error } = await client.from(table).select("id").eq("event_id", eventId).eq("id", entityId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function createManagedSession(
  client: QueryClient,
  eventId: string,
  input: ManagedSessionInput,
  startsAt: string,
  endsAt: string,
  requestId: string,
): Promise<string> {
  const { data, error } = await client.rpc("admin_create_session", {
    target_event_id: eventId,
    session_title: input.title.trim(),
    session_description: input.description.trim(),
    session_room: input.room.trim(),
    session_start_time: startsAt,
    session_end_time: endsAt,
    session_published: input.published,
    mutation_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function updateManagedSession(
  client: QueryClient,
  sessionId: string,
  input: ManagedSessionInput,
  startsAt: string,
  endsAt: string,
  requestId: string,
): Promise<void> {
  const { error } = await client.rpc("admin_update_session", {
    target_session_id: sessionId,
    session_title: input.title.trim(),
    session_description: input.description.trim(),
    session_room: input.room.trim(),
    session_start_time: startsAt,
    session_end_time: endsAt,
    mutation_request_id: requestId,
  });
  if (error) throw error;
}

export async function setManagedSessionPublished(client: QueryClient, sessionId: string, published: boolean, requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_set_session_published", { target_session_id: sessionId, next_published: published, mutation_request_id: requestId });
  if (error) throw error;
}

export async function setManagedSessionSpeakers(client: QueryClient, sessionId: string, speakerIds: string[], requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_set_session_speakers", { target_session_id: sessionId, target_speaker_ids: speakerIds, mutation_request_id: requestId });
  if (error) throw error;
}

export async function deleteManagedSession(client: QueryClient, sessionId: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_delete_session", { target_session_id: sessionId, mutation_request_id: requestId });
  if (error) throw error;
}

export async function createManagedSpeaker(client: QueryClient, eventId: string, input: ManagedSpeakerInput, requestId: string): Promise<string> {
  const { data, error } = await client.rpc("admin_create_speaker", {
    target_event_id: eventId,
    speaker_name: input.name.trim(),
    speaker_photo_url: input.photoUrl.trim(),
    speaker_role: input.role,
    speaker_organization: input.organization.trim(),
    speaker_bio: input.bio.trim(),
    speaker_linkedin_url: input.linkedinUrl.trim(),
    speaker_published: input.published,
    mutation_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function updateManagedSpeaker(client: QueryClient, speakerId: string, input: ManagedSpeakerInput, requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_update_speaker", {
    target_speaker_id: speakerId,
    speaker_name: input.name.trim(),
    speaker_photo_url: input.photoUrl.trim(),
    speaker_role: input.role,
    speaker_organization: input.organization.trim(),
    speaker_bio: input.bio.trim(),
    speaker_linkedin_url: input.linkedinUrl.trim(),
    mutation_request_id: requestId,
  });
  if (error) throw error;
}

export async function setManagedSpeakerPublished(client: QueryClient, speakerId: string, published: boolean, requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_set_speaker_published", { target_speaker_id: speakerId, next_published: published, mutation_request_id: requestId });
  if (error) throw error;
}

export async function deleteManagedSpeaker(client: QueryClient, speakerId: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("admin_delete_speaker", { target_speaker_id: speakerId, mutation_request_id: requestId });
  if (error) throw error;
}

export async function setManagedEventBranding(
  client: QueryClient,
  eventId: string,
  kind: "logo" | "cover",
  path: string | null,
  requestId: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("set_event_branding", {
    target_event_id: eventId,
    asset_kind: kind,
    // Generated RPC types cannot express nullable PostgreSQL arguments.
    asset_path: path as unknown as string,
    mutation_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function issueManagedEventAdminInvitation(client: QueryClient, eventId: string, email: string, tokenHash: string, requestId: string): Promise<string> {
  const { data, error } = await client.rpc("issue_event_admin_invitation", {
    target_event_id: eventId, invite_email: email.trim().toLowerCase(), invitation_token_hash: tokenHash, mutation_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function reserveManagedEventInvitationEmail(client: QueryClient, invitationId: string, requestId: string): Promise<string> {
  const { data, error } = await client.rpc("reserve_event_admin_invitation_email", { target_invitation_id: invitationId, mutation_request_id: requestId });
  if (error) throw error;
  return data;
}

export async function completeManagedEventInvitationEmail(client: QueryClient, deliveryId: string, sent: boolean, providerMessageId: string | null, failureCode: string | null): Promise<void> {
  const { error } = await client.rpc("complete_event_admin_invitation_email", {
    target_delivery_id: deliveryId, was_sent: sent,
    provider_message_id: providerMessageId as unknown as string,
    failure_code: failureCode as unknown as string,
  });
  if (error) throw error;
}

export async function revokeManagedEventAdminInvitation(client: QueryClient, invitationId: string, reason: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("revoke_event_admin_invitation", { target_invitation_id: invitationId, revocation_reason: reason.trim(), mutation_request_id: requestId });
  if (error) throw error;
}

export async function removeManagedEventAdmin(client: QueryClient, membershipId: string, reason: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("remove_event_admin", { target_membership_id: membershipId, removal_reason: reason.trim(), mutation_request_id: requestId });
  if (error) throw error;
}

export async function transferManagedEventOwnership(client: QueryClient, eventId: string, membershipId: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("transfer_event_ownership", { target_event_id: eventId, next_owner_membership_id: membershipId, mutation_request_id: requestId });
  if (error) throw error;
}

export async function getManagedEventInvitationPreview(client: QueryClient, tokenHash: string) {
  const { data, error } = await client.rpc("get_event_admin_invitation_preview", { invitation_token_hash: tokenHash });
  if (error) throw error;
  return data;
}

export async function acceptManagedEventAdminInvitation(client: QueryClient, tokenHash: string, requestId: string): Promise<void> {
  const { error } = await client.rpc("accept_event_admin_invitation", { invitation_token_hash: tokenHash, mutation_request_id: requestId });
  if (error) throw error;
}
