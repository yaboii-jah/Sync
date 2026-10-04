import { Typography } from "@/components/ui/static";
import { createClient } from "@/lib/supabase/server";
import {
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AdminSessionsClient } from "@/components/admin/admin-sessions-client";

export default async function AdminSessionsPage() {
  const supabase = await createClient();

  const [sessions, event] = await Promise.all([
    getSessionsWithSpeakers(supabase),
    getEvent(supabase),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Program flow
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Create, edit and publish the schedule here. Start and end each session
        manually; scheduled times do not change its status. Drafts are hidden
        from attendees.
      </Typography>
      <AdminSessionsClient sessions={sessions} eventId={event?.id ?? null} />
    </div>
  );
}
