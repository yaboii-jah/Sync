import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { EventPushSettings } from "@/components/settings/event-push-settings";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";

export default async function EventSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const supabase = await createClient();
  const access = await getEventAccessBySlug(supabase, user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (!access.permissions.canViewAttendeeExperience) notFound();
  const { data, error } = await supabase.from("event_notification_preferences")
    .select("push_enabled").eq("event_id", access.event.id).eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <p className="platform-kicker">{access.event.name}</p>
    <h1 className="organizer-heading mt-2">Notification settings</h1>
    <EventPushSettings slug={slug} initiallyEnabled={data?.push_enabled ?? false} />
  </div></PlatformShell>;
}
