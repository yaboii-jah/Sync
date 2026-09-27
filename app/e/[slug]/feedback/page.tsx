import { notFound, redirect } from "next/navigation";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";

export default async function EventFeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const access = await getEventAccessBySlug(await createClient(), user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience || access.event.lifecycle === "draft") notFound();
  const writable = access.event.lifecycle === "published" && !access.event.isSuspended &&
    access.event.role === "attendee" && access.event.membershipStatus === "active";
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <p className="platform-kicker">{access.event.name}</p>
    <h1 className="organizer-heading mt-2">Event feedback</h1>
    <p className="mt-3 text-sm text-muted">Tell this event’s team what worked or what could improve.</p>
    <div className="mt-6 max-w-xl">{writable ? <FeedbackForm initialRequestId={crypto.randomUUID()} eventSlug={slug} /> :
      <p role="status" className="text-sm text-muted">Feedback submissions are closed for this event.</p>}</div>
  </div></PlatformShell>;
}
