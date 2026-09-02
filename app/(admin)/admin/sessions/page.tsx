import { Typography } from "@heroui/react";
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
        Create, edit and publish the schedule here. Manual Start or End remains
        authoritative until Resume Auto; a draft is hidden from attendees and
        the scheduled job leaves it alone.
      </Typography>
      <AdminSessionsClient sessions={sessions} eventId={event?.id ?? null} />
    </div>
  );
}
