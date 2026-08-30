"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import {
  createAdminNotification,
  searchAdminAttendees,
  setAdminSessionStatus,
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
