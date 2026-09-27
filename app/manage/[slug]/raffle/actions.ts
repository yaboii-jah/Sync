"use server";

import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { normalizeEventSlug } from "@/lib/events/routing";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getEventRaffleAttendeeDetail, getEventRaffleSnapshot } from "@/lib/supabase/queries/event-feedback";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getScopedRaffleSnapshot(slug: string) {
  if (!isMultiTenantPlatformEnabled()) throw new Error("Raffle unavailable");
  const normalized = normalizeEventSlug(slug);
  if (!normalized) throw new Error("Invalid event");
  const { event, supabase } = await requireEventManager(normalized);
  if (event.lifecycle === "draft" || event.isSuspended) throw new Error("Raffle unavailable");
  return getEventRaffleSnapshot(supabase, event.id);
}

export async function getScopedRaffleAttendeeDetail(slug: string, membershipId: string) {
  if (!isMultiTenantPlatformEnabled()) throw new Error("Raffle unavailable");
  const normalized = normalizeEventSlug(slug);
  if (!normalized || !UUID_PATTERN.test(membershipId)) throw new Error("Invalid raffle attendee");
  const { event, supabase } = await requireEventManager(normalized);
  if (event.lifecycle === "draft" || event.isSuspended) throw new Error("Raffle unavailable");
  return getEventRaffleAttendeeDetail(supabase, event.id, membershipId);
}
