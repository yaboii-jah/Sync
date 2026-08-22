"use client";

import { useState, useTransition } from "react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { toggleBookmark, type ToggleBookmarkResult } from "@/app/home/actions";
import { SessionCard } from "./session-card";
import { SessionModal } from "./session-modal";

type View = "all" | "flow";

interface HomeClientProps {
  sessions: SessionWithSpeakers[];
  initialBookmarks: string[];
}

export function HomeClient({ sessions, initialBookmarks }: HomeClientProps) {
  const [view, setView] = useState<View>("all");
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const [activeSession, setActiveSession] = useState<SessionWithSpeakers | null>(
    null,
  );
  const [, startTransition] = useTransition();

  function handleToggleBookmark(sessionId: string) {
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
        setBookmarks((previous) => {
          const reverted = new Set(previous);
          if (reverted.has(sessionId)) {
            reverted.delete(sessionId);
          } else {
            reverted.add(sessionId);
          }
          return reverted;
        });
      }
    });
  }

  const visible =
    view === "all"
      ? sessions
      : sessions.filter((session) => bookmarks.has(session.id));

  const segmentedButtonClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2 text-xs font-bold tracking-[0.14em] uppercase transition-colors ${
      active ? "bg-pastel-yellow text-charcoal" : "text-text-muted hover:text-text-primary"
    }`;

  return (
    <section>
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
            onToggleBookmark={handleToggleBookmark}
            onOpen={setActiveSession}
          />
        ))}
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center text-sm text-text-muted">
            Nothing in your flow yet — switch to All and bookmark the sessions
            you don&apos;t want to miss.
          </p>
        ) : null}
      </div>

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          onToggleBookmark={handleToggleBookmark}
          onClose={() => setActiveSession(null)}
        />
      ) : null}
    </section>
  );
}
