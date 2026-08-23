import { LogOut } from "lucide-react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  getBookmarkedSessionIds,
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { HomeClient } from "@/components/home/home-client";
import { InstallChip } from "@/components/push/install-chip";
import { PushGate } from "@/components/push/push-gate";
import { signOut } from "./actions";

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
      <header className="flex items-center justify-between px-4 pt-8 lg:hidden">
        <p className="font-display text-2xl text-text-primary uppercase">
          Sync
        </p>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="rounded-lg p-2 text-text-muted transition-colors hover:text-text-primary"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </header>

      {event ? (
        <div className="mx-auto w-full max-w-md px-4 pt-6 lg:max-w-[1280px] lg:px-10 lg:pt-2">
          <PushGate />
          <HomeClient
            initialEvent={event}
            initialSessions={sessions}
            initialBookmarks={bookmarks}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-md px-4 pt-10">
          <p className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center text-sm text-text-muted">
            Event details are being finalized — check back soon.
          </p>
        </div>
      )}

      <InstallChip />
    </main>
  );
}
