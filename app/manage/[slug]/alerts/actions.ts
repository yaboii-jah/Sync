"use server";

import { revalidatePath } from "next/cache";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { eventManagePath } from "@/lib/events/routing";

export async function sendEventAlertAction(input: {
  slug: string; title: string; body: string; audience: "all" | "selected";
  membershipIds: string[]; requestId: string;
}): Promise<{ error: string | null; notificationId?: string; recipientCount?: number }> {
  const { event, supabase } = await requireEventManager(input.slug);
  if (event.isSuspended || event.lifecycle !== "published") return { error: "Only published, active events can send alerts." };
  if (!input.title.trim() || input.title.length > 80 || input.body.length > 240) return { error: "Title or body is too long." };
  if (input.audience !== "all" && input.audience !== "selected") return { error: "Invalid audience." };
  if (input.audience === "selected" && input.membershipIds.length === 0) return { error: "Select at least one active member." };
  const { data, error } = await supabase.rpc("send_event_alert", {
    target_event_id: event.id,
    alert_title: input.title,
    alert_body: input.body,
    audience: input.audience,
    target_membership_ids: input.audience === "all" ? [] : input.membershipIds,
    mutation_request_id: input.requestId,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { error: "Could not send this alert. Check recipients and try again." };
  revalidatePath(`${eventManagePath(event.slug)}/alerts`);
  return {
    error: null,
    notificationId: typeof data.notification_id === "string" ? data.notification_id : undefined,
    recipientCount: typeof data.recipient_count === "number" ? data.recipient_count : undefined,
  };
}
