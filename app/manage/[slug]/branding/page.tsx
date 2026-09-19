import { BrandingManager } from "@/components/manage/branding-manager";
import { requireEventManager } from "@/lib/supabase/management-auth";

export default async function BrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, user } = await requireEventManager((await params).slug);

  return <BrandingManager
    slug={event.slug}
    eventId={event.id}
    userId={user.id}
    logoPath={event.logoPath}
    coverPath={event.coverPath}
    readOnly={!permissions.canManageContent}
  />;
}
