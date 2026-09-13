import { Typography } from "@/components/ui/static";
import { createClient } from "@/lib/supabase/server";
import {
  getEventById,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AdminSessionsClient } from "@/components/admin/admin-sessions-client";
import { getRequestAuth } from "@/lib/supabase/request-auth";
import { getUserEvents } from "@/lib/supabase/queries/events";
import { selectPreferredEvent } from "@/lib/events/routing";

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const { claims } = await getRequestAuth();
  const selected = claims ? selectPreferredEvent(await getUserEvents(supabase, claims.sub), "manage") : null;

  const [sessions, event] = await Promise.all([
    selected ? getSessionsWithSpeakers(supabase, selected.id) : Promise.resolve([]),
    selected ? getEventById(supabase, selected.id) : Promise.resolve(null),
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
