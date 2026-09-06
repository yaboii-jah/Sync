import { Card } from "@/components/ui/static";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/empty-states";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  getBookmarkedSessionIds,
  getEvent,
  getPublishedSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AppHeader } from "@/components/app-header";
import { HomeClient } from "@/components/home/home-client";
import { PushGate } from "@/components/push/push-gate";

function getServerNow(): number {
  return Date.now();
}

export default async function HomePage() {
  await requireCompleteProfile();

  const supabase = await createClient();
  const [event, sessions, bookmarks] = await Promise.all([
    getEvent(supabase),
    getPublishedSessionsWithSpeakers(supabase),
    getBookmarkedSessionIds(supabase),
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
              initialNow={initialNow}
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
