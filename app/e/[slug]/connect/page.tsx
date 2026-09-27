import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EventConnectClient } from "@/components/connect/event-connect-client";
import { ScannedAttendeesCard } from "@/components/connect/scanned-attendees-card";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { eventCardPath, eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { getMyEventNetworkingCard, getMyEventNetworkingScans } from "@/lib/supabase/queries/event-networking";
import { createClient } from "@/lib/supabase/server";

export default async function EventConnectPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user, profile } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience || access.event.lifecycle === "draft") notFound();
  const [card, scans, headerList] = await Promise.all([
    getMyEventNetworkingCard(access.event.id), getMyEventNetworkingScans(access.event.id), headers(),
  ]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : null);
  if (!origin) throw new Error("Could not determine the networking card origin");
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <p className="platform-kicker">{access.event.name}</p>
    <h1 className="organizer-heading mt-2 mb-6">Connect</h1>
    <EventConnectClient slug={slug} name={profile.name} photoUrl={profile.photo_url}
      cardUrl={card ? new URL(eventCardPath(slug, card.token), origin).toString() : ""}
      card={card} archived={access.event.lifecycle === "archived"} />
    <section className="mt-6"><ScannedAttendeesCard scans={scans.map((scan) => ({
      name: scan.name, photoUrl: scan.photoUrl, cardUrl: scan.token ? new URL(eventCardPath(slug, scan.token), origin).toString() : null,
    }))} /></section>
  </div></PlatformShell>;
}
