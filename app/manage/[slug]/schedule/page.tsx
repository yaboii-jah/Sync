import { ScheduleManager } from "@/components/manage/schedule-manager";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getManagedSpeakers } from "@/lib/supabase/queries/management";
import { getSessionsWithSpeakers } from "@/lib/supabase/queries/program-flow";

export default async function EventScheduleManagementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, supabase } = await requireEventManager((await params).slug);
  if (event.isSuspended) return <section><h2 className="text-2xl font-bold tracking-tight">Schedule</h2><p className="mt-3 text-muted">Schedule content is unavailable while this event is suspended.</p></section>;
  const [sessions, speakers] = await Promise.all([
    getSessionsWithSpeakers(supabase, event.id),
    getManagedSpeakers(supabase, event.id),
  ]);
  return <ScheduleManager slug={event.slug} timezone={event.timezone} sessions={sessions} speakers={speakers} readOnly={!permissions.canManageContent} />;
}

