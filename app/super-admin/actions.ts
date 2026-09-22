"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";

export interface PlatformActionState { message?: string; success?: boolean; nextRequestId?: string }
const value = (form: FormData, key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
const uuid = (input: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input);
const fail = (error: unknown): PlatformActionState => {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("reason")) return { message: "Give a reason between 8 and 1,000 characters." };
  if (message.includes("support session")) return { message: "The support session changed or expired. Reload and try again." };
  if (message.includes("read-only")) return { message: "This event is read-only." };
  if (message.includes("access")) return { message: "Your platform access changed. Reload and try again." };
  console.error("platform operation failed", { code: typeof error === "object" && error !== null && "code" in error ? error.code : "unknown" });
  return { message: "The platform operation could not be completed. Reload and try again." };
};
const next = () => crypto.randomUUID();

export async function setPlatformQuotaAction(targetUserId: string, _previous: PlatformActionState, form: FormData): Promise<PlatformActionState> {
  const requestId = value(form, "requestId");
  if (!uuid(targetUserId) || !uuid(requestId)) return { message: "Invalid request. Reload and try again." };
  const numberOrNull = (key: string, multiplier = 1) => {
    const raw = value(form, key); if (!raw) return null;
    const parsed = Number(raw); return Number.isInteger(parsed) ? parsed * multiplier : Number.NaN;
  };
  const input = {
    next_active_event_limit: numberOrNull("activeEventLimit"),
    next_event_admin_limit: numberOrNull("eventAdminLimit"),
    next_event_session_limit: numberOrNull("eventSessionLimit"),
    next_branding_upload_bytes: numberOrNull("brandingUploadMb", 1024 * 1024),
  };
  if (Object.values(input).some((item) => typeof item === "number" && !Number.isFinite(item))) return { message: "Quota values must be whole numbers." };
  try {
    const { supabase } = await requirePlatformSuperAdmin();
    const { error } = await supabase.rpc("set_platform_quota_override", {
      target_user_id: targetUserId,
      next_active_event_limit: input.next_active_event_limit as number,
      next_event_admin_limit: input.next_event_admin_limit as number,
      next_event_session_limit: input.next_event_session_limit as number,
      next_branding_upload_bytes: input.next_branding_upload_bytes as number,
      change_reason: value(form, "reason"), mutation_request_id: requestId,
    });
    if (error) throw error;
    revalidatePath("/super-admin", "layout");
    return { success: true, message: "Quota override saved.", nextRequestId: next() };
  } catch (error) { return { ...fail(error), nextRequestId: next() }; }
}

export async function setEventSuspensionAction(eventId: string, shouldSuspend: boolean, _previous: PlatformActionState, form: FormData): Promise<PlatformActionState> {
  const requestId = value(form, "requestId");
  if (!uuid(eventId) || !uuid(requestId)) return { message: "Invalid request. Reload and try again." };
  try {
    const { supabase } = await requirePlatformSuperAdmin();
    const { error } = await supabase.rpc("set_event_suspension", { target_event_id: eventId, should_suspend: shouldSuspend, suspension_note: value(form, "reason"), mutation_request_id: requestId });
    if (error) throw error;
    revalidatePath(`/super-admin/events/${eventId}`); revalidatePath("/super-admin/events");
    return { success: true, message: shouldSuspend ? "Event suspended." : "Event suspension removed.", nextRequestId: next() };
  } catch (error) { return { ...fail(error), nextRequestId: next() }; }
}

export async function startSupportSessionAction(eventId: string, _previous: PlatformActionState, form: FormData): Promise<PlatformActionState> {
  const requestId = value(form, "requestId");
  if (!uuid(eventId) || !uuid(requestId)) return { message: "Invalid request. Reload and try again." };
  try {
    const { supabase } = await requirePlatformSuperAdmin();
    const { error } = await supabase.rpc("start_event_support_session", { target_event_id: eventId, support_reason: value(form, "reason"), mutation_request_id: requestId });
    if (error) throw error;
    revalidatePath("/super-admin", "layout");
    return { success: true, message: "Support access started for 60 minutes.", nextRequestId: next() };
  } catch (error) { return { ...fail(error), nextRequestId: next() }; }
}

export async function endSupportSessionAction(eventId: string, sessionId: string, _previous: PlatformActionState, form: FormData): Promise<PlatformActionState> {
  const requestId = value(form, "requestId");
  if (![eventId, sessionId, requestId].every(uuid)) return { message: "Invalid request. Reload and try again." };
  try {
    const { supabase } = await requirePlatformSuperAdmin();
    const { error } = await supabase.rpc("end_event_support_session", { target_support_session_id: sessionId, mutation_request_id: requestId });
    if (error) throw error;
    revalidatePath("/super-admin", "layout");
    return { success: true, message: "Support access ended.", nextRequestId: next() };
  } catch (error) { return { ...fail(error), nextRequestId: next() }; }
}

export async function moderateSupportedAttendeeAction(eventId: string, membershipId: string, nextStatus: string, _previous: PlatformActionState, form: FormData): Promise<PlatformActionState> {
  const requestId = value(form, "requestId");
  if (![eventId, membershipId, requestId].every(uuid) || !["active", "removed", "blocked"].includes(nextStatus)) return { message: "Invalid request. Reload and try again." };
  try {
    const { supabase } = await requirePlatformSuperAdmin();
    const { error } = await supabase.rpc("moderate_event_attendee", { target_membership_id: membershipId, next_status: nextStatus, moderation_reason: value(form, "reason"), mutation_request_id: requestId });
    if (error) throw error;
    revalidatePath(`/super-admin/events/${eventId}/support`);
    return { success: true, message: "Attendee status updated.", nextRequestId: next() };
  } catch (error) { return { ...fail(error), nextRequestId: next() }; }
}
