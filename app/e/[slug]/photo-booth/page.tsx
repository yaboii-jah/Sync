import { notFound, redirect } from "next/navigation";
import { PhotoBoothClient } from "@/components/photo-booth/photo-booth-client";
import { PlatformShell } from "@/components/platform/platform-shell";
import { ScopedEventNavigation } from "@/components/platform/scoped-event-navigation";
import { eventPublicPath, normalizeEventSlug } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getEventAccessBySlug } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Photo Booth · Sync", robots: { index: false, follow: false } };

export default async function EventPhotoBoothPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isMultiTenantPlatformEnabled()) notFound();
  const slug = normalizeEventSlug((await params).slug);
  if (!slug) notFound();
  const { user } = await requireCompleteProfile();
  const access = await getEventAccessBySlug(await createClient(), user.id, slug);
  if (!access) redirect(eventPublicPath(slug));
  if (access.event.membershipStatus !== "active" || access.event.isSuspended ||
    !["published", "archived"].includes(access.event.lifecycle)) notFound();

  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <ScopedEventNavigation slug={slug} />
    <p className="platform-kicker">{access.event.name}</p>
    <h1 className="organizer-heading mt-2">Photo Booth</h1>
    <p className="mt-2 text-sm text-muted">Make a three-shot keepsake. Your camera, photos, and finished JPEG stay on this device.</p>
    <div className="mt-7 max-w-xl"><PhotoBoothClient frameSet="scoped" /></div>
  </div></PlatformShell>;
}
