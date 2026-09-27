import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { NetworkCard } from "@/components/network-card";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { eventConnectPath, eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { getEventNetworkingCard, recordEventNetworkingScan } from "@/lib/supabase/queries/event-networking";
import { createClient } from "@/lib/supabase/server";

export default async function EventNetworkingCardPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const { slug: rawSlug, token } = await params;
  const slug = normalizeEventSlug(rawSlug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience || access.event.lifecycle === "draft") notFound();
  const card = await getEventNetworkingCard(access.event.id, token);
  if (!card) notFound();
  if (access.event.lifecycle === "published") {
    try { await recordEventNetworkingScan(access.event.id, token); }
    catch (error) { console.error("Could not record event networking scan", error); }
  }
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <Link className="platform-link mb-6 inline-block" href={eventConnectPath(slug)}>Back to Connect</Link>
    <p className="platform-kicker mb-3">{access.event.name} · You met</p>
    <div className="max-w-md"><NetworkCard variant={card.template} name={card.name} photoUrl={card.photoUrl} links={card.links} eventNeutral /></div>
  </div></PlatformShell>;
}
