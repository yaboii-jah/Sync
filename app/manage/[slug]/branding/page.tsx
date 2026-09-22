import { BrandingManager } from "@/components/manage/branding-manager";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getEventBrandingUploadLimit } from "@/lib/supabase/queries/platform-admin";

export default async function BrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, user, supabase } = await requireEventManager((await params).slug);
  const maxUploadBytes = await getEventBrandingUploadLimit(supabase, event.id);

  return <BrandingManager
    slug={event.slug}
    eventId={event.id}
    userId={user.id}
    logoPath={event.logoPath}
    coverPath={event.coverPath}
    readOnly={!permissions.canManageContent}
    maxUploadBytes={maxUploadBytes}
  />;
}
