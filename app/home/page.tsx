import { LogOut } from "lucide-react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import {
  getBookmarkedSessionIds,
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { formatManilaDate } from "@/lib/format";
import { HeroCard } from "@/components/home/hero-card";
import { HomeClient } from "@/components/home/home-client";
import { signOut } from "./actions";

export default async function HomePage() {
  await requireCompleteProfile();

  const [event, sessions, bookmarks] = await Promise.all([
    getEvent(),
    getSessionsWithSpeakers(),
    getBookmarkedSessionIds(),
  ]);

  return (
    <main className="w-full">
      <header className="flex items-center justify-between lg:hidden">
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
        <>
          <div className="lg:flex lg:items-start lg:gap-12">
            <div className="lg:sticky lg:top-10 lg:w-[38%] lg:max-w-sm lg:self-start">
              <HeroCard event={event} sessions={sessions} />
              <p className="mt-4 hidden text-sm text-text-muted lg:block">
                {formatManilaDate(event.starts_at)} · {event.venue}
              </p>
            </div>

            <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
              <h2 className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
                Program Flow · {formatManilaDate(event.starts_at)}
              </h2>
              <div className="mt-3">
                <HomeClient sessions={sessions} initialBookmarks={bookmarks} />
              </div>
            </section>
          </div>
        </>
      ) : (
        <p className="mt-10 rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center text-sm text-text-muted">
          Event details are being finalized — check back soon.
        </p>
      )}
    </main>
  );
}
