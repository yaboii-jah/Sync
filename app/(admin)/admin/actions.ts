"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminNotification,
  createAdminSession,
  deleteAdminSession,
  searchAdminAttendees,
  setAdminSessionPublished,
  setAdminSessionStatus,
  updateAdminSession,
  type AdminAttendee,
} from "@/lib/supabase/queries/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AdminActionResult {
  error?: string;
  notificationId?: string;
  recipientCount?: number;
  deviceCount?: number;
}

export async function sendAdminNotification(input: {
  title: string;
  body: string;
  audience: "all" | "selected";
  recipientIds: string[];
  requestId: string;
}): Promise<AdminActionResult> {
  await requireAdmin();

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 1 || title.length > 80) {
    return { error: "Title must be between 1 and 80 characters." };
  }
  if (body.length > 240) return { error: "Body must be at most 240 characters." };
  if (!UUID_PATTERN.test(input.requestId)) return { error: "Invalid request." };
  if (input.audience !== "all" && input.audience !== "selected") {
    return { error: "Invalid audience." };
  }
  if (
    input.audience === "selected" &&
    (input.recipientIds.length === 0 ||
      input.recipientIds.some((id) => !UUID_PATTERN.test(id)))
  ) {
    return { error: "Select at least one valid attendee." };
  }

  try {
    const supabase = await createClient();
    const result = await createAdminNotification(supabase, {
      title,
      body,
      audience: input.audience,
      recipientIds: input.audience === "all" ? [] : [...new Set(input.recipientIds)],
      requestId: input.requestId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/notifications");
    revalidatePath("/alerts");
    return {
      notificationId: result.notification_id,
      recipientCount: result.recipient_count,
      deviceCount: result.device_count,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not send notification.",
    };
  }
}

export async function searchAttendeesAction(query: string): Promise<AdminAttendee[]> {
  await requireAdmin();
  const supabase = await createClient();
  return searchAdminAttendees(supabase, query.trim(), 50, 0);
}

export async function changeSessionStatus(input: {
  sessionId: string;
  action: "start" | "end" | "resume_auto";
  sendNotification: boolean;
  requestId: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.sessionId) || !UUID_PATTERN.test(input.requestId)) {
    return { error: "Invalid session request." };
  }
  if (!(["start", "end", "resume_auto"] as const).includes(input.action)) {
    return { error: "Invalid session action." };
  }

  try {
    const supabase = await createClient();
    await setAdminSessionStatus(supabase, input);
    revalidatePath("/admin");
    revalidatePath("/admin/sessions");
    revalidatePath("/admin/notifications");
    revalidatePath("/home");
    revalidatePath("/alerts");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update session.",
    };
  }
}

/** Every surface a schedule edit can appear on. */
function revalidateProgramFlow(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/home");
}

interface SessionFormInput {
  title: string;
  description: string;
  room: string;
  startTime: string;
  endTime: string;
  requestId: string;
}

/**
 * Shared validation for create and edit. Times arrive as `datetime-local`
 * strings, which carry no zone, so they are read in the browser's zone and
 * sent as ISO — the same convention the rest of the app stores in.
 */
function validateSessionForm(
  input: SessionFormInput,
): { error: string } | { startIso: string; endIso: string; title: string } {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) {
    return { error: "Title must be between 1 and 120 characters." };
  }
  if (input.description.length > 2000) {
    return { error: "Description must be at most 2000 characters." };
  }
  if (input.room.length > 120) {
    return { error: "Room must be at most 120 characters." };
  }
  if (!UUID_PATTERN.test(input.requestId)) return { error: "Invalid request." };

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Enter a valid start and end time." };
  }
  if (end <= start) return { error: "End time must be after the start time." };

  return { startIso: start.toISOString(), endIso: end.toISOString(), title };
}

export async function createSessionAction(
  input: SessionFormInput & { eventId: string; published: boolean },
): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.eventId)) return { error: "Invalid event." };

  const validated = validateSessionForm(input);
  if ("error" in validated) return validated;

  try {
    const supabase = await createClient();
    await createAdminSession(supabase, {
      eventId: input.eventId,
      title: validated.title,
      description: input.description.trim(),
      room: input.room.trim(),
      startTime: validated.startIso,
      endTime: validated.endIso,
      published: input.published,
      requestId: input.requestId,
    });
    revalidateProgramFlow();
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create the session.",
    };
  }
}

export async function updateSessionAction(
  input: SessionFormInput & { sessionId: string },
): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.sessionId)) return { error: "Invalid session." };

  const validated = validateSessionForm(input);
  if ("error" in validated) return validated;

  try {
    const supabase = await createClient();
    await updateAdminSession(supabase, {
      sessionId: input.sessionId,
      title: validated.title,
      description: input.description.trim(),
      room: input.room.trim(),
      startTime: validated.startIso,
      endTime: validated.endIso,
      requestId: input.requestId,
    });
    revalidateProgramFlow();
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update the session.",
    };
  }
}

export async function setSessionPublishedAction(input: {
  sessionId: string;
  published: boolean;
  requestId: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.sessionId) || !UUID_PATTERN.test(input.requestId)) {
    return { error: "Invalid request." };
  }

  try {
    const supabase = await createClient();
    await setAdminSessionPublished(supabase, input);
    revalidateProgramFlow();
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not change visibility.",
    };
  }
}

export async function deleteSessionAction(input: {
  sessionId: string;
  requestId: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.sessionId) || !UUID_PATTERN.test(input.requestId)) {
    return { error: "Invalid request." };
  }

  try {
    const supabase = await createClient();
    await deleteAdminSession(supabase, input);
    revalidateProgramFlow();
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete the session.",
    };
  }
}
