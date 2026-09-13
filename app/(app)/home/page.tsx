import { Card } from "@/components/ui/static";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/empty-states";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  getBookmarkedSessionIds,
  getClaimedSessionIds,
  getEventById,
  getPublishedSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AppHeader } from "@/components/app-header";
import { HomeClient } from "@/components/home/home-client";
import { PushGate } from "@/components/push/push-gate";
import { getUserEvents } from "@/lib/supabase/queries/events";
import { selectPreferredEvent } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

function getServerNow(): number {
  return Date.now();
}

export default async function HomePage() {
  const { user } = await requireCompleteProfile();
  if (isMultiTenantPlatformEnabled()) redirect("/events");

  const supabase = await createClient();
  const preferredEvent = selectPreferredEvent(await getUserEvents(supabase, user.id));
  const eventId = preferredEvent?.id;
  const [event, sessions, bookmarks, claims] = await Promise.all([
    eventId ? getEventById(supabase, eventId) : Promise.resolve(null),
    eventId ? getPublishedSessionsWithSpeakers(supabase, eventId) : Promise.resolve([]),
    eventId ? getBookmarkedSessionIds(supabase, eventId) : Promise.resolve([]),
    eventId ? getClaimedSessionIds(supabase, eventId) : Promise.resolve([]),
  ]);
  const initialNow = getServerNow();

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-[1280px] lg:px-10 lg:pt-10">
        <AppHeader />

        {event ? (
          <div className="mt-6">
            <PushGate />
            <HomeClient
              initialEvent={event}
              initialSessions={sessions}
              initialBookmarks={bookmarks}
              initialClaims={claims}
              initialNow={initialNow}
              eventSlug={event.slug}
            />
          </div>
        ) : (
          <div className="mt-10">
            <Card>
              <EmptyState
                icon={<CalendarClock />}
                title="Event details are being finalized"
                description="Check back soon for the schedule."
              />
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
