import { notFound, redirect } from "next/navigation";
import { HomeClient } from "@/components/home/home-client";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PushGate } from "@/components/push/push-gate";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
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

  return (
    <PlatformShell>
      <div className="platform-frame py-8 sm:py-12">
        <div className="mb-8 border-b pb-5 platform-rule">
          <p className="platform-kicker">Attendee experience</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{event.name}</h1>
          <Link href={eventPublicPath(slug)} className="platform-link mt-3 text-sm">Public page</Link>
        </div>
        <PushGate />
        <HomeClient initialEvent={event} initialSessions={sessions} initialBookmarks={bookmarks} initialClaims={claims} initialNow={getServerNow()} eventSlug={slug} showVenueMap={false} />
      </div>
    </PlatformShell>
  );
}
