"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SubmitFeedbackState } from "@/app/(app)/more/feedback/actions";
import { FEEDBACK_MESSAGE_MAX_LENGTH, isFeedbackCategory } from "@/lib/feedback";
import { eventFeedbackPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { submitEventFeedbackEntry } from "@/lib/supabase/queries/event-feedback";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(error: string, field: SubmitFeedbackState["field"] = null): SubmitFeedbackState {
  return { error, field, success: false, completedRequestId: null };
}

export async function submitEventFeedback(_previous: SubmitFeedbackState, data: FormData): Promise<SubmitFeedbackState> {
  if (!isMultiTenantPlatformEnabled()) return invalid("Event feedback is unavailable.");
  const slug = typeof data.get("event_slug") === "string" ? normalizeEventSlug(data.get("event_slug") as string) : null;
  if (!slug) return invalid("Invalid event.");
  const category = data.get("category");
  if (!isFeedbackCategory(category)) return invalid("Choose a feedback category.", "category");
  const rawMessage = data.get("message");
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (!message) return invalid("Tell us a little more before sending.", "message");
  if (message.length > FEEDBACK_MESSAGE_MAX_LENGTH) return invalid(`Keep your message to ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`, "message");
  const requestId = data.get("request_id");
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) return invalid("This form has expired. Refresh and try again.");
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) redirect("/login");
  const access = await getEventAccessBySlug(supabase, claims.sub, slug);
  if (!access || access.event.role !== "attendee" || access.event.membershipStatus !== "active" ||
    access.event.lifecycle !== "published" || access.event.isSuspended) return invalid("Event feedback is unavailable.");
  try {
    await submitEventFeedbackEntry(supabase, { eventId: access.event.id, category, message, requestId });
  } catch (error) {
    console.error("Event feedback submission failed", error);
    return invalid("Could not send your feedback. Please try again.");
  }
  revalidatePath(`/manage/${slug}/feedback`);
  revalidatePath(eventFeedbackPath(slug));
  return { error: null, field: null, success: true, completedRequestId: requestId };
}
