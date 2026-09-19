import { SpeakersManager } from "@/components/manage/speakers-manager";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getManagedSpeakers } from "@/lib/supabase/queries/management";

export default async function EventSpeakersManagementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, supabase } = await requireEventManager((await params).slug);
  if (event.isSuspended) return <section><h2 className="text-2xl font-bold tracking-tight">Speakers</h2><p className="mt-3 text-muted">Speaker content is unavailable while this event is suspended.</p></section>;
  const speakers = await getManagedSpeakers(supabase, event.id);
  return <SpeakersManager slug={event.slug} speakers={speakers} readOnly={!permissions.canManageContent} />;
}

