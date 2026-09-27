"use server";

import { revalidatePath } from "next/cache";
import { eventSettingsPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";

export async function setEventPushPreferenceAction(rawSlug: string, enabled: boolean): Promise<{ error: string | null }> {
  const slug = normalizeEventSlug(rawSlug);
  if (!isMultiTenantPlatformEnabled() || !slug) return { error: "Event not found." };
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access || !access.permissions.canViewAttendeeExperience) return { error: "Event access required." };
  const { error } = await supabase.rpc("set_event_push_preference", { target_event_id: access.event.id, enabled });
  if (error) return { error: "Could not update this event's push preference." };
  revalidatePath(eventSettingsPath(slug));
  return { error: null };
}
