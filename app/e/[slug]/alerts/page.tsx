import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { ScopedAlertsClient } from "@/components/alerts/scoped-alerts-client";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import { getLastReadAt } from "@/lib/supabase/queries/alert-reads";
import { createClient } from "@/lib/supabase/server";

export default async function EventAlertsPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience) notFound();
  const [alerts, lastReadAt] = await Promise.all([
    getNotifications(supabase, 50, access.event.id),
    getLastReadAt(supabase, access.event.id),
  ]);
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <p className="platform-kicker">{access.event.name}</p>
    <h1 className="organizer-heading mt-2">Alerts</h1>
    <p className="mt-2 text-sm text-muted">Announcements for this event only.</p>
    <ScopedAlertsClient eventId={access.event.id} slug={slug} initialAlerts={alerts} initialLastReadAt={lastReadAt} />
  </div></PlatformShell>;
}
