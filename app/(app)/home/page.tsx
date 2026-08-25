import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  getBookmarkedSessionIds,
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { AppHeader } from "@/components/app-header";
import { HomeClient } from "@/components/home/home-client";
import { InstallChip } from "@/components/push/install-chip";
import { PushGate } from "@/components/push/push-gate";

export default async function HomePage() {
  await requireCompleteProfile();

  const supabase = await createClient();
  const [event, sessions, bookmarks] = await Promise.all([
    getEvent(supabase),
    getSessionsWithSpeakers(supabase),
    getBookmarkedSessionIds(supabase),
  ]);

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
            />
          </div>
        ) : (
          <div className="mt-10">
            <p className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center text-sm text-text-muted">
              Event details are being finalized — check back soon.
            </p>
          </div>
        )}
      </div>
      <InstallChip />
    </main>
  );
}
