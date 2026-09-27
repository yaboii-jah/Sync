import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { HomeClient } from "@/components/home/home-client";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { eventBrandingPublicUrl } from "@/lib/events/branding";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { getBookmarkedSessionIds, getClaimedSessionIds, getEventById, getPublishedSessionsWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function getServerNow(): number {
  return Date.now();
}

export default async function ScopedEventHomePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience) notFound();
  const [event, sessions, bookmarks, claims] = await Promise.all([
    getEventById(supabase, access.event.id),
    getPublishedSessionsWithSpeakers(supabase, access.event.id),
    getBookmarkedSessionIds(supabase, access.event.id),
    getClaimedSessionIds(supabase, access.event.id),
  ]);
  if (!event) notFound();
  const logoUrl = eventBrandingPublicUrl(event.logo_path);
  const coverUrl = eventBrandingPublicUrl(event.cover_path);

  return (
    <PlatformShell>
      <div className="platform-frame py-8 sm:py-12">
        {coverUrl ? <div className="relative mb-8 aspect-[16/6] overflow-hidden rounded-2xl bg-default"><Image src={coverUrl} alt="" fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" unoptimized /></div> : null}
        <div className="mb-8 border-b pb-5 platform-rule">
          <p className="platform-kicker">Attendee experience</p>
          <div className="mt-2 flex items-center gap-4">
            {logoUrl ? <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-default"><Image src={logoUrl} alt={`${event.name} logo`} fill sizes="56px" className="object-contain" unoptimized /></div> : null}
            <h1 className="text-2xl font-semibold tracking-[-0.035em]">{event.name}</h1>
          </div>
          <Link href={eventPublicPath(slug)} className="platform-link mt-3 text-sm">Public page</Link>
        </div>
        <ScopedEventNavigation slug={slug} />
        <HomeClient initialEvent={event} initialSessions={sessions} initialBookmarks={bookmarks} initialClaims={claims} initialNow={getServerNow()} eventSlug={slug} showVenueMap={false} />
      </div>
    </PlatformShell>
  );
}
