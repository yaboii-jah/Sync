import { Typography } from "@/components/ui/static";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AdminSessionsClient } from "@/components/admin/admin-sessions-client";
import { getAdminSessionHistoryIds } from "@/lib/supabase/queries/admin";

export default async function AdminSessionsPage() {
  const supabase = await createClient();

  const [sessions, event] = await Promise.all([
    getSessionsWithSpeakers(supabase),
    getEvent(supabase),
  ]);
  const sessionHistoryIds = await getAdminSessionHistoryIds(
    supabase,
    sessions.map((session) => session.id),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Program flow
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Create, edit and publish the schedule here. Start and end each session
        manually; scheduled times do not change its status. Drafts are hidden
        from attendees. Use Undo End to recover an accidentally ended session.
      </Typography>
      <AdminSessionsClient
        sessions={sessions}
        eventId={event?.id ?? null}
        sessionHistoryIds={sessionHistoryIds}
      />
    </div>
  );
}
