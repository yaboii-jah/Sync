"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  getBookmarkedSessionIds,
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { formatManilaDate } from "@/lib/format";
import { toggleBookmark, type ToggleBookmarkResult } from "@/app/(app)/home/actions";
import { useProgramFlowRealtime } from "@/hooks/use-program-flow-realtime";
import { useNow } from "@/hooks/use-now";
import { useToast } from "@/components/toast/toast-provider";
import { effectiveSessionStatus } from "@/lib/format";
import { EmptyComet } from "@/components/empty-states";
import { HeroCard } from "./hero-card";
import { SessionCard } from "./session-card";
import { SessionModal } from "@/components/sessions/session-modal";
import { ScrollToNow } from "./scroll-to-now";
import { LiveMiniBar } from "./live-mini-bar";

type View = "all" | "flow";

interface HomeClientProps {
  initialEvent: EventInfo;
  initialSessions: SessionWithSpeakers[];
  initialBookmarks: string[];
}

export function HomeClient({
  initialEvent,
  initialSessions,
  initialBookmarks,
}: HomeClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [sessions, setSessions] = useState(initialSessions);
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const [view, setView] = useState<View>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const now = useNow(1000);
  const { toast } = useToast();
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  const liveSession =
    sessions.find(
      (session) => effectiveSessionStatus(session, now) === "ongoing",
    ) ?? null;

  async function refetchProgramFlow() {
    const client = createClient();
    const [nextEvent, nextSessions, nextBookmarks] = await Promise.all([
      getEvent(client),
      getSessionsWithSpeakers(client),
      getBookmarkedSessionIds(client),
    ]);

    if (nextEvent) setEvent(nextEvent);
    setSessions(nextSessions);
    setBookmarks(new Set(nextBookmarks));
  }

  useProgramFlowRealtime(() => {
    void startTransition(() => {
      void refetchProgramFlow();
    });
  });

  function handleToggleBookmark(sessionId: string) {
    const wasBookmarked = bookmarks.has(sessionId);

    setBookmarks((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });

    startTransition(async () => {
      const result: ToggleBookmarkResult = await toggleBookmark(sessionId);
      if (result.error) {
        toast("Couldn't update your flow", "error");
        setBookmarks((previous) => {
          const reverted = new Set(previous);
          if (reverted.has(sessionId)) {
            reverted.delete(sessionId);
          } else {
            reverted.add(sessionId);
          }
          return reverted;
        });
      } else {
        toast(wasBookmarked ? "Removed from My Flow" : "Added to My Flow");
      }
    });
  }

  const visible =
    view === "all"
      ? sessions
      : sessions.filter(
          (session) =>
            bookmarks.has(session.id) &&
            effectiveSessionStatus(session, now) !== "finished",
        );

  const segmentedButtonClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-xs font-bold tracking-[0.14em] uppercase transition-colors ${
      active ? "bg-pastel-yellow text-charcoal" : "text-text-muted hover:text-text-primary"
    }`;

  return (
    <>
      {liveSession ? (
        <LiveMiniBar
          targetId={`session-${liveSession.id}`}
          title={liveSession.title}
        />
      ) : null}

      <div className="lg:flex lg:items-start lg:gap-12">
          <div className="lg:sticky lg:top-10 lg:w-[38%] lg:max-w-sm lg:self-start">
            <HeroCard event={event} sessions={sessions} now={now} />
          <p className="mt-4 hidden text-sm text-text-muted lg:block">
            {formatManilaDate(event.starts_at)} · {event.venue}
          </p>
        </div>

        <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
          <h2 className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
            Program Flow · {formatManilaDate(event.starts_at)}
          </h2>

          <div className="mt-3">
            <div className="rounded-xl border border-border-default p-1">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setView("all")}
                  aria-pressed={view === "all"}
                  className={segmentedButtonClass(view === "all")}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setView("flow")}
                  aria-pressed={view === "flow"}
                  className={segmentedButtonClass(view === "flow")}
                >
                  My Flow
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {visible.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  bookmarked={bookmarks.has(session.id)}
                  now={now}
                  onToggleBookmark={handleToggleBookmark}
                  onOpen={(session) => setActiveSessionId(session.id)}
                />
              ))}
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center">
                  <EmptyComet />
                  <p className="mt-3 text-sm text-text-muted">
                    Nothing in your flow yet — switch to All and bookmark the
                    sessions you don&apos;t want to miss.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          onToggleBookmark={handleToggleBookmark}
          onClose={() => setActiveSessionId(null)}
        />
      ) : null}

      <ScrollToNow targetId={liveSession ? `session-${liveSession.id}` : null} />
    </>
  );
}

