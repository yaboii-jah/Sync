"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { validateEventBasics, type EventBasicsInput } from "@/lib/events/basics";
import { eventHomePath, eventManagePath, eventPublicPath } from "@/lib/events/routing";
import { organizerErrorMessage, type OrganizerActionState } from "@/lib/events/organizer-actions";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createManagedEvent, updateManagedEventBasics } from "@/lib/supabase/queries/management";
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
