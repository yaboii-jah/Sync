"use server";

import { revalidatePath } from "next/cache";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { eventConnectPath, normalizeEventSlug } from "@/lib/events/routing";
import { getAuthenticatedClaims } from "@/lib/supabase/auth";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { saveEventNetworkingCard, saveEventReusableSocialLinks } from "@/lib/supabase/queries/event-networking";
import { createClient } from "@/lib/supabase/server";
import { normalizeSocialUrl, SOCIAL_NETWORKS, SOCIAL_SPECS, type SocialLinks, type SocialNetwork } from "@/lib/social";

export async function saveEventCardAction(slugValue: string, formData: FormData): Promise<{ error: string | null }> {
  const slug = normalizeEventSlug(slugValue);
  if (!isMultiTenantPlatformEnabled() || !slug) return { error: "Event unavailable." };
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) return { error: "Sign in to update your card." };
  const access = await getEventAccessBySlug(supabase, claims.sub, slug);
  if (!access || !access.permissions.canViewAttendeeExperience || access.event.lifecycle !== "published") {
    return { error: "This event card is read-only or unavailable." };
  }
  const raw = formData.getAll("network");
  if (raw.some((item) => typeof item !== "string" || !SOCIAL_NETWORKS.includes(item as SocialNetwork)) || new Set(raw).size !== raw.length) {
    return { error: "Choose valid social links." };
  }
  const template = Number(formData.get("template"));
  if (template !== 1 && template !== 2 && template !== 3 && template !== 4) return { error: "Choose a valid template." };
  try {
    await saveEventNetworkingCard(access.event.id, raw as SocialNetwork[], template);
    revalidatePath(eventConnectPath(slug));
    return { error: null };
  } catch {
    return { error: "Could not save your card. Check your links in Account Settings and try again." };
  }
}

export async function saveReusableLinksAction(slugValue: string, formData: FormData): Promise<{ error: string | null }> {
  const slug = normalizeEventSlug(slugValue);
  if (!isMultiTenantPlatformEnabled() || !slug) return { error: "Event unavailable." };
  const supabase = await createClient();
  const claims = await getAuthenticatedClaims(supabase);
  if (!claims) return { error: "Sign in to update your links." };
  const access = await getEventAccessBySlug(supabase, claims.sub, slug);
  if (!access || !access.permissions.canViewAttendeeExperience || access.event.lifecycle !== "published") {
    return { error: "This event is read-only or unavailable." };
  }
  const links: SocialLinks = {};
  for (const network of SOCIAL_NETWORKS) {
    const raw = formData.get(network);
    if (typeof raw !== "string") return { error: "Invalid social link." };
    if (!raw.trim()) continue;
    const canonical = normalizeSocialUrl(network, raw.trim());
    if (!canonical) return { error: `That does not look like a ${SOCIAL_SPECS[network].label} profile link.` };
    links[network] = canonical;
  }
  try {
    await saveEventReusableSocialLinks(access.event.id, links);
    revalidatePath(eventConnectPath(slug));
    return { error: null };
  } catch {
    return { error: "Could not save your links. Please try again." };
  }
}
