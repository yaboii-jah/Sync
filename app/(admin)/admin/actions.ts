"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { parseManilaDateTimeInput } from "@/lib/format";
import {
  createAdminNotification,
  createAdminSession,
  deleteAdminSession,
  searchAdminAttendees,
  getAdminAttendee,
  getAdminRaffleAttendees,
  setAdminSessionCapacity,
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
  /** Set by `createSessionAction` so the caller can follow up on the new row. */
  sessionId?: string;
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

export async function searchAttendeesAction(query: string, offset = 0): Promise<AdminAttendee[]> {
  await requireAdmin();
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new Error("Invalid pagination offset");
  const supabase = await createClient();
  return searchAdminAttendees(supabase, query.trim(), 50, offset);
}

export async function getAttendeeDetailAction(userId: string) {
  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new Error("Invalid attendee");
  return getAdminAttendee(await createClient(), userId);
}

export async function getRaffleSnapshotAction() {
  await requireAdmin();
  return getAdminRaffleAttendees(await createClient());
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
 * Shared validation for create and edit. `datetime-local` values carry no
 * zone, so they must be interpreted as Asia/Manila wall-clock times before
 * being sent to the timestamptz columns.
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

  const startIso = parseManilaDateTimeInput(input.startTime);
  const endIso = parseManilaDateTimeInput(input.endTime);
  if (!startIso || !endIso) {
    return { error: "Enter a valid start and end time." };
  }
  if (new Date(endIso) <= new Date(startIso)) {
    return { error: "End time must be after the start time." };
  }

  return { startIso, endIso, title };
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
    const sessionId = await createAdminSession(supabase, {
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
    return { sessionId };
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

/**
 * Set a session's seat numbers.
 *
 * Kept separate from the details save because `assert_admin_mutation` refuses
 * to reuse one request id across two different actions — and because seats and
 * schedule are corrected on different days by different people.
 *
 * A null capacity means "no seat limit", which is the state of every session
 * that is not a workshop. The database is the one that decides whether a new
 * capacity still covers the seats attendees are sitting in, so its refusal is
 * passed through verbatim: it names the numbers, and this surface is
 * admin-only.
 */
export async function setSessionCapacityAction(input: {
  sessionId: string;
  capacity: number | null;
  reservedSeats: number;
  seatsClosed: boolean;
  requestId: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!UUID_PATTERN.test(input.sessionId) || !UUID_PATTERN.test(input.requestId)) {
    return { error: "Invalid request." };
  }

  const { capacity, reservedSeats } = input;
  if (capacity !== null) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000) {
      return { error: "Capacity must be a whole number of at least 1." };
    }
    if (!Number.isInteger(reservedSeats) || reservedSeats < 0) {
      return { error: "Reserved seats must be zero or more." };
    }
    if (reservedSeats > capacity) {
      return { error: "Reserved seats cannot exceed the capacity." };
    }
  }

  try {
    const supabase = await createClient();
    await setAdminSessionCapacity(supabase, {
      sessionId: input.sessionId,
      capacity,
      reservedSeats: capacity === null ? 0 : reservedSeats,
      seatsClosed: capacity === null ? false : input.seatsClosed,
      requestId: input.requestId,
    });
    revalidateProgramFlow();
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update seats.",
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
