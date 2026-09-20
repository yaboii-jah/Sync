"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { validateEventBasics, type EventBasicsInput } from "@/lib/events/basics";
import { eventHomePath, eventManagePath, eventPublicPath } from "@/lib/events/routing";
import { organizerErrorMessage, type OrganizerActionState } from "@/lib/events/organizer-actions";
import {
  EVENT_BRANDING_BUCKET,
  EVENT_BRANDING_MAX_BYTES,
  EVENT_BRANDING_STAGING_BUCKET,
  eventBrandingDeliveryPath,
  isEventBrandingKind,
  isExpectedBrandingStagingPath,
  type BrandingActionResult,
  type EventBrandingKind,
} from "@/lib/events/branding";
import { normalizeEventBrandingImage } from "@/lib/events/branding-image";
import { createInvitationToken, eventInvitationUrl, invitationTokenHash, isTeamReason, teamInputError, type InvitationDeliveryStatus } from "@/lib/events/team";
import { isEventAdminInvitationEmailConfigured, sendEventAdminInvitation } from "@/lib/email/event-admin-invitation";
import {
  validateManagedSession,
  validateManagedSpeaker,
  validateSpeakerIds,
  type ManagedSessionInput,
  type ManagedSpeakerInput,
  type ProgramActionResult,
} from "@/lib/events/program-management";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import {
  createManagedEvent,
  createManagedSession,
  createManagedSpeaker,
  deleteManagedSession,
  deleteManagedSpeaker,
  eventProgramEntityExists,
  getManagedSpeakers,
  setManagedSessionPublished,
  setManagedSessionSpeakers,
  setManagedSpeakerPublished,
  setManagedEventBranding,
  completeManagedEventInvitationEmail,
  issueManagedEventAdminInvitation,
  removeManagedEventAdmin,
  reserveManagedEventInvitationEmail,
  revokeManagedEventAdminInvitation,
  transferManagedEventOwnership,
  updateManagedEventBasics,
  updateManagedSession,
  updateManagedSpeaker,
} from "@/lib/supabase/queries/management";
import { acceptManagedEventAdminInvitation, getManagedEventInvitationPreview } from "@/lib/supabase/queries/management";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const field = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};
function basics(form: FormData): EventBasicsInput {
  return { name: field(form, "name"), slug: field(form, "slug"), description: field(form, "description"),
    venue: field(form, "venue"), timezone: field(form, "timezone").trim(),
    startsAt: field(form, "startsAt"), endsAt: field(form, "endsAt") };
}
function revalidateEvent(slug: string) {
  revalidatePath("/events");
  revalidatePath(eventManagePath(slug), "layout");
  revalidatePath(eventPublicPath(slug));
  revalidatePath(eventHomePath(slug));
}
function failure(error: unknown, action: string): OrganizerActionState {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : "unknown";
  console.error("organizer mutation failed", { action, code });
  return { message: organizerErrorMessage(error) };
}

function programFailure(error: unknown, action: string): ProgramActionResult {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const message = typeof record.message === "string" ? record.message : "";
  console.error("program mutation failed", { action, code: record.code ?? "unknown" });
  if (message.includes("read-only") || message.includes("suspended")) return { error: "This event is read-only. Reload to see its current state." };
  if (message.includes("access required") || message.includes("authentication required")) return { error: "Your permission changed. Reload before trying again." };
  if (message.includes("event window")) return { error: "The session must stay within the event dates." };
  if (message.includes("session limit")) return { error: "This event has reached its session limit." };
  if (message.includes("only unpublished") || message.includes("not started")) return { error: "Only an unpublished session that has not started can be deleted." };
  if (message.includes("linked speakers")) return { error: "Unlink this person from every session before deleting them." };
  if (message.includes("speaker list") || message.includes("every speaker")) return { error: "The speaker selection changed or belongs to another event. Reload and try again." };
  return { error: "The change could not be saved. Retry, or reload if the problem continues." };
}

function validRequestIds(...ids: string[]): boolean {
  return ids.every((id) => UUID_PATTERN.test(id));
}

async function mutableEvent(slug: string) {
  const access = await requireEventManager(slug);
  if (!access.permissions.canManageContent) return null;
  return access;
}

function brandingFailure(error: unknown, action: string): BrandingActionResult {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const message = typeof record.message === "string" ? record.message : "";
  console.error("branding mutation failed", { action, code: record.code ?? "unknown" });
  if (message.includes("read-only") || message.includes("suspended")) return { error: "This event is read-only. Reload to see its current state." };
  if (message.includes("access required") || message.includes("row-level security")) return { error: "Your permission changed. Reload before trying again." };
  if (message.startsWith("The image") || message.startsWith("The normalized")) return { error: message };
  return { error: "The branding image could not be saved. Retry, or choose another image." };
}

export interface TeamActionResult {
  error?: string;
  success?: string;
  invitationUrl?: string;
  delivery?: InvitationDeliveryStatus;
  slug?: string;
}

function teamFailure(error: unknown, action: string): TeamActionResult {
  const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : {};
  const message = typeof record.message === "string" ? record.message : "";
  console.error("team mutation failed", { action, code: record.code ?? "unknown" });
  if (message.includes("read-only") || message.includes("suspended")) return { error: "This event is read-only. Reload to see its current state." };
  if (message.includes("owner access") || message.includes("access required") || message.includes("authentication required")) return { error: "Your permission changed. Reload before trying again." };
  if (message.includes("admin limit")) return { error: "This event has reached its active admin limit." };
  if (message.includes("pending invitation")) return { error: "That invitation is no longer pending. Reload and try again." };
  return { error: "The team change could not be saved. Retry, or reload if the problem continues." };
}

function teamOwner(access: Awaited<ReturnType<typeof requireEventManager>>) {
  return access.permissions.canManageAdmins && access.permissions.canTransferOwnership ? access : null;
}

export async function issueEventAdminInvitationAction(input: { slug: string; email: string; requestId: string; deliveryRequestId: string }): Promise<TeamActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access || !teamOwner(access)) return { error: "Only the event owner can manage the team." };
  if (!validRequestIds(input.requestId, input.deliveryRequestId)) return { error: "Invalid request. Reload and try again." };
  const inputError = teamInputError(input.email);
  if (inputError) return { error: inputError };
  const token = createInvitationToken();
  const tokenHash = invitationTokenHash(token);
  if (!tokenHash) return { error: "The invitation could not be created. Retry." };
  let invitationUrl: string;
  try { invitationUrl = eventInvitationUrl(token); } catch (error) { return teamFailure(error, "team.invite.url"); }
  try {
    const invitationId = await issueManagedEventAdminInvitation(access.supabase, access.event.id, input.email, tokenHash, input.requestId);
    let delivery: InvitationDeliveryStatus = "not_configured";
    if (isEventAdminInvitationEmailConfigured()) {
      try {
        const deliveryId = await reserveManagedEventInvitationEmail(access.supabase, invitationId, input.deliveryRequestId);
        const sent = await sendEventAdminInvitation({ deliveryId, email: input.email.trim().toLowerCase(), eventName: access.event.name, invitationUrl });
        delivery = sent.status;
        await completeManagedEventInvitationEmail(access.supabase, deliveryId, sent.status === "sent", sent.providerMessageId ?? null, sent.failureCode ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        delivery = message.includes("email limit reached") ? "limit_reached" : "failed";
        console.error("team invitation delivery failed", { code: typeof error === "object" && error !== null && "code" in error ? error.code : "unknown" });
      }
    }
    revalidateEvent(access.event.slug);
    return { success: "Invitation created.", invitationUrl, delivery };
  } catch (error) { return teamFailure(error, "team.invite.issue"); }
}

export async function revokeEventAdminInvitationAction(input: { slug: string; invitationId: string; reason: string; requestId: string }): Promise<TeamActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access || !teamOwner(access)) return { error: "Only the event owner can manage the team." };
  if (!validRequestIds(input.invitationId, input.requestId) || !isTeamReason(input.reason)) return { error: "Give a reason between 8 and 1,000 characters." };
  try { await revokeManagedEventAdminInvitation(access.supabase, input.invitationId, input.reason, input.requestId); revalidateEvent(access.event.slug); return { success: "Invitation revoked." }; }
  catch (error) { return teamFailure(error, "team.invite.revoke"); }
}

export async function removeEventAdminAction(input: { slug: string; membershipId: string; reason: string; requestId: string }): Promise<TeamActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access || !teamOwner(access)) return { error: "Only the event owner can manage the team." };
  if (!validRequestIds(input.membershipId, input.requestId) || !isTeamReason(input.reason)) return { error: "Give a reason between 8 and 1,000 characters." };
  try { await removeManagedEventAdmin(access.supabase, input.membershipId, input.reason, input.requestId); revalidateEvent(access.event.slug); return { success: "Admin removed." }; }
  catch (error) { return teamFailure(error, "team.admin.remove"); }
}

export async function transferEventOwnershipAction(input: { slug: string; membershipId: string; confirmation: string; requestId: string }): Promise<TeamActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access || !teamOwner(access)) return { error: "Only the event owner can transfer ownership." };
  if (!validRequestIds(input.membershipId, input.requestId)) return { error: "Invalid request. Reload and try again." };
  if (input.confirmation !== access.event.name) return { error: "Type the event name exactly to confirm ownership transfer." };
  try { await transferManagedEventOwnership(access.supabase, access.event.id, input.membershipId, input.requestId); revalidateEvent(access.event.slug); return { success: "Ownership transferred." }; }
  catch (error) { return teamFailure(error, "team.ownership.transfer"); }
}

function previewResult(data: unknown): { status: string; name?: string; slug?: string; expiresAt?: string } {
  const value = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
  return { status: typeof value.status === "string" ? value.status : "invalid", name: typeof value.name === "string" ? value.name : undefined, slug: typeof value.slug === "string" ? value.slug : undefined, expiresAt: typeof value.expires_at === "string" ? value.expires_at : undefined };
}

export async function previewEventAdminInvitationAction(token: string): Promise<{ status: string; name?: string; slug?: string; expiresAt?: string }> {
  const hash = invitationTokenHash(token);
  if (!hash) return { status: "invalid" };
  await requireCompleteProfile();
  const supabase = await createClient();
  try { return previewResult(await getManagedEventInvitationPreview(supabase, hash)); }
  catch { return { status: "invalid" }; }
}

export async function acceptEventAdminInvitationAction(token: string, requestId: string): Promise<TeamActionResult> {
  const hash = invitationTokenHash(token);
  if (!hash || !validRequestIds(requestId)) return { error: "This invitation link is invalid or has been replaced." };
  await requireCompleteProfile();
  const supabase = await createClient();
  try {
    const preview = previewResult(await getManagedEventInvitationPreview(supabase, hash));
    if (preview.status !== "valid" || !preview.slug) return { error: "This invitation is no longer available for this account." };
    await acceptManagedEventAdminInvitation(supabase, hash, requestId);
    revalidatePath("/events");
    revalidatePath(eventManagePath(preview.slug), "layout");
    return { success: "You are now an event admin.", slug: preview.slug };
  } catch (error) { return teamFailure(error, "team.invite.accept"); }
}

async function removeBrandingObject(access: Awaited<ReturnType<typeof requireEventManager>>, bucket: string, path: string) {
  const { error } = await access.supabase.storage.from(bucket).remove([path]);
  if (error) console.error("branding object cleanup failed", { bucket, code: error.statusCode ?? "unknown" });
}

export async function processEventBrandingAction(input: {
  slug: string;
  kind: EventBrandingKind;
  stagingPath: string;
  requestId: string;
}): Promise<BrandingActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!isEventBrandingKind(input.kind) || !validRequestIds(input.requestId) ||
      !isExpectedBrandingStagingPath(input.stagingPath, access.event.id, access.user.id)) {
    return { error: "Invalid upload request. Choose the image again." };
  }

  let deliveryPath: string | null = null;
  try {
    const downloaded = await access.supabase.storage.from(EVENT_BRANDING_STAGING_BUCKET).download(input.stagingPath);
    if (downloaded.error) throw downloaded.error;
    if (downloaded.data.size < 1 || downloaded.data.size > EVENT_BRANDING_MAX_BYTES) throw new Error("The image must be no larger than 10 MB.");
    const normalized = await normalizeEventBrandingImage(Buffer.from(await downloaded.data.arrayBuffer()), input.kind);
    deliveryPath = eventBrandingDeliveryPath(access.event.id, input.kind, crypto.randomUUID());
    const uploaded = await access.supabase.storage.from(EVENT_BRANDING_BUCKET).upload(deliveryPath, normalized, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    const previousPath = await setManagedEventBranding(access.supabase, access.event.id, input.kind, deliveryPath, input.requestId);
    if (previousPath && previousPath !== deliveryPath) await removeBrandingObject(access, EVENT_BRANDING_BUCKET, previousPath);
    revalidateEvent(access.event.slug);
    return { path: deliveryPath };
  } catch (error) {
    if (deliveryPath) await removeBrandingObject(access, EVENT_BRANDING_BUCKET, deliveryPath);
    return brandingFailure(error, `branding.${input.kind}.process`);
  } finally {
    await removeBrandingObject(access, EVENT_BRANDING_STAGING_BUCKET, input.stagingPath);
  }
}

export async function removeEventBrandingAction(input: {
  slug: string;
  kind: EventBrandingKind;
  requestId: string;
}): Promise<BrandingActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!isEventBrandingKind(input.kind) || !validRequestIds(input.requestId)) return { error: "Invalid removal request." };
  try {
    const previousPath = await setManagedEventBranding(access.supabase, access.event.id, input.kind, null, input.requestId);
    if (previousPath) await removeBrandingObject(access, EVENT_BRANDING_BUCKET, previousPath);
    revalidateEvent(access.event.slug);
    return { path: null };
  } catch (error) {
    return brandingFailure(error, `branding.${input.kind}.remove`);
  }
}

export async function createEventAction(_previous: OrganizerActionState, form: FormData): Promise<OrganizerActionState> {
  if (!isMultiTenantPlatformEnabled()) notFound();
  await requireCompleteProfile();
  const input = basics(form);
  const validated = validateEventBasics(input, true);
  if (Object.keys(validated.errors).length) return { errors: validated.errors, message: "Check the highlighted event details." };
  const requestId = field(form, "requestId");
  if (!UUID_PATTERN.test(requestId)) return { message: "Invalid request. Reload the form." };
  try {
    await createManagedEvent(await createClient(), { ...input, slug: validated.slug! }, validated.startsAt!, validated.endsAt!, requestId);
  } catch (error) { return failure(error, "create_event"); }
  revalidatePath("/events");
  redirect(eventManagePath(validated.slug!));
}

export async function updateEventBasicsAction(slug: string, _previous: OrganizerActionState, form: FormData): Promise<OrganizerActionState> {
  const { event, permissions, supabase } = await requireEventManager(slug);
  if (!permissions.canManageContent) return { message: "This event is read-only." };
  const input = { ...basics(form), slug: event.slug };
  const validated = validateEventBasics(input, false);
  if (Object.keys(validated.errors).length) return { errors: validated.errors, message: "Check the highlighted event details." };
  const requestId = field(form, "requestId");
  if (!UUID_PATTERN.test(requestId)) return { message: "Invalid request. Reload the form." };
  try {
    await updateManagedEventBasics(supabase, event.id, input, validated.startsAt!, validated.endsAt!, requestId);
  } catch (error) { return failure(error, "update_event_basics"); }
  revalidateEvent(event.slug);
  return { success: true, message: "Event details saved.", nextRequestId: crypto.randomUUID() };
}

export async function eventLifecycleAction(slug: string, action: "publish" | "archive" | "delete", _previous: OrganizerActionState, form: FormData): Promise<OrganizerActionState> {
  const { event, permissions, supabase } = await requireEventManager(slug);
  const allowed = action === "publish" ? permissions.canPublish : action === "archive" ? permissions.canArchive : action === "delete" && permissions.canDeleteDraft;
  if (!allowed) return { message: "This action is unavailable for your role or the event’s current state." };
  const requestId = field(form, "requestId");
  if (!UUID_PATTERN.test(requestId)) return { message: "Invalid request. Reload the page." };
  const reason = field(form, "reason").trim();
  if (action !== "publish" && (reason.length < 8 || reason.length > 1000)) return { message: "Give a reason between 8 and 1,000 characters." };
  if (action === "delete" && field(form, "confirmation") !== event.name) return { message: "Type the event name exactly to confirm deletion." };
  try {
    const result = action === "publish"
      ? await supabase.rpc("publish_event", { target_event_id: event.id, mutation_request_id: requestId })
      : action === "archive"
      ? await supabase.rpc("archive_event", { target_event_id: event.id, archive_reason: reason, mutation_request_id: requestId })
      : await supabase.rpc("delete_untouched_draft_event", { target_event_id: event.id, deletion_reason: reason, mutation_request_id: requestId });
    if (result.error) throw result.error;
  } catch (error) { return failure(error, `event.${action}`); }
  revalidateEvent(event.slug);
  if (action === "delete") redirect("/events");
  return { success: true, message: action === "publish" ? "Event published." : "Event archived. It is now read-only.", nextRequestId: crypto.randomUUID() };
}

export async function saveManagedSessionAction(input: {
  slug: string;
  sessionId: string | null;
  values: ManagedSessionInput;
  speakerIds: string[];
  detailsRequestId: string;
  speakersRequestId: string;
}): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!validRequestIds(input.detailsRequestId, input.speakersRequestId)) return { error: "Invalid request. Reload the editor." };
  if (input.sessionId && !UUID_PATTERN.test(input.sessionId)) return { error: "Invalid session." };
  const speakerError = validateSpeakerIds(input.speakerIds);
  if (speakerError) return { error: speakerError };

  const validated = validateManagedSession(input.values, access.event.timezone, access.event.startsAt, access.event.endsAt);
  if (validated.error || !validated.startsAt || !validated.endsAt) return { error: validated.error ?? "Invalid session times." };

  try {
    if (input.sessionId && !await eventProgramEntityExists(access.supabase, access.event.id, "session", input.sessionId)) {
      return { error: "That session does not belong to this event." };
    }
    const availableSpeakers = new Set((await getManagedSpeakers(access.supabase, access.event.id)).map((speaker) => speaker.id));
    if (input.speakerIds.some((id) => !availableSpeakers.has(id))) return { error: "Every selected speaker must belong to this event." };

    const sessionId = input.sessionId ?? await createManagedSession(
      access.supabase,
      access.event.id,
      input.values,
      validated.startsAt,
      validated.endsAt,
      input.detailsRequestId,
    );
    if (input.sessionId) {
      await updateManagedSession(access.supabase, sessionId, input.values, validated.startsAt, validated.endsAt, input.detailsRequestId);
    }
    try {
      await setManagedSessionSpeakers(access.supabase, sessionId, input.speakerIds, input.speakersRequestId);
    } catch (error) {
      revalidateEvent(access.event.slug);
      return { ...programFailure(error, "session.set_speakers"), entityId: sessionId };
    }
    revalidateEvent(access.event.slug);
    return { entityId: sessionId };
  } catch (error) {
    return programFailure(error, input.sessionId ? "session.update" : "session.create");
  }
}

export async function setManagedSessionPublishedAction(input: { slug: string; sessionId: string; published: boolean; requestId: string }): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!UUID_PATTERN.test(input.sessionId) || !validRequestIds(input.requestId)) return { error: "Invalid request." };
  try {
    if (!await eventProgramEntityExists(access.supabase, access.event.id, "session", input.sessionId)) return { error: "That session does not belong to this event." };
    await setManagedSessionPublished(access.supabase, input.sessionId, input.published, input.requestId);
    revalidateEvent(access.event.slug);
    return {};
  } catch (error) { return programFailure(error, "session.publish"); }
}

export async function deleteManagedSessionAction(input: { slug: string; sessionId: string; requestId: string }): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!UUID_PATTERN.test(input.sessionId) || !validRequestIds(input.requestId)) return { error: "Invalid request." };
  try {
    if (!await eventProgramEntityExists(access.supabase, access.event.id, "session", input.sessionId)) return { error: "That session does not belong to this event." };
    await deleteManagedSession(access.supabase, input.sessionId, input.requestId);
    revalidateEvent(access.event.slug);
    return {};
  } catch (error) { return programFailure(error, "session.delete"); }
}

export async function saveManagedSpeakerAction(input: { slug: string; speakerId: string | null; values: ManagedSpeakerInput; requestId: string }): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!validRequestIds(input.requestId) || (input.speakerId !== null && !UUID_PATTERN.test(input.speakerId))) return { error: "Invalid request." };
  const validated = validateManagedSpeaker(input.values);
  if (validated.error) return { error: validated.error };
  try {
    if (input.speakerId && !await eventProgramEntityExists(access.supabase, access.event.id, "speaker", input.speakerId)) return { error: "That speaker does not belong to this event." };
    const speakerId = input.speakerId ?? await createManagedSpeaker(access.supabase, access.event.id, input.values, input.requestId);
    if (input.speakerId) await updateManagedSpeaker(access.supabase, speakerId, input.values, input.requestId);
    revalidateEvent(access.event.slug);
    return { entityId: speakerId };
  } catch (error) { return programFailure(error, input.speakerId ? "speaker.update" : "speaker.create"); }
}

export async function setManagedSpeakerPublishedAction(input: { slug: string; speakerId: string; published: boolean; requestId: string }): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!UUID_PATTERN.test(input.speakerId) || !validRequestIds(input.requestId)) return { error: "Invalid request." };
  try {
    if (!await eventProgramEntityExists(access.supabase, access.event.id, "speaker", input.speakerId)) return { error: "That speaker does not belong to this event." };
    await setManagedSpeakerPublished(access.supabase, input.speakerId, input.published, input.requestId);
    revalidateEvent(access.event.slug);
    return {};
  } catch (error) { return programFailure(error, "speaker.publish"); }
}

export async function deleteManagedSpeakerAction(input: { slug: string; speakerId: string; requestId: string }): Promise<ProgramActionResult> {
  const access = await mutableEvent(input.slug);
  if (!access) return { error: "This event is read-only." };
  if (!UUID_PATTERN.test(input.speakerId) || !validRequestIds(input.requestId)) return { error: "Invalid request." };
  try {
    if (!await eventProgramEntityExists(access.supabase, access.event.id, "speaker", input.speakerId)) return { error: "That speaker does not belong to this event." };
    await deleteManagedSpeaker(access.supabase, input.speakerId, input.requestId);
    revalidateEvent(access.event.slug);
    return {};
  } catch (error) { return programFailure(error, "speaker.delete"); }
}
