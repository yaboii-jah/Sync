"use client";

import { Bookmark } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  displayStatus,
  formatTimeRange,
  relativeStartLabel,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

interface SessionCardProps {
  session: SessionWithSpeakers;
  bookmarked: boolean;
  now: number;
  onToggleBookmark: (sessionId: string) => void;
  onOpen: (session: SessionWithSpeakers) => void;
}

export function SessionCard({
  session,
  bookmarked,
  now,
  onToggleBookmark,
  onOpen,
}: SessionCardProps) {
  const status = displayStatus(session.start_time, session.end_time, now);
  const ongoing = status === "ongoing";
  const relative = relativeStartLabel(session.start_time, now);

  return (
    <article
      id={`session-${session.id}`}
      className={`relative overflow-hidden rounded-2xl border bg-bg-base ${
        ongoing
          ? "border-pastel-yellow/50 shadow-[0_0_24px_rgba(188,131,48,0.25)]"
          : "border-border-default"
      }`}
    >
      {ongoing ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-pastel-yellow"
        />
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(session)}
        className="w-full px-4 py-4 text-left"
        aria-haspopup="dialog"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
            {formatTimeRange(session.start_time, session.end_time)}
            {relative ? (
              <span
                suppressHydrationWarning
                className={`ml-2 normal-case ${
                  ongoing ? "text-pastel-yellow" : "text-text-muted/70"
                }`}
              >
                · {relative}
              </span>
            ) : null}
          </span>
          <StatusBadge status={status} />
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug text-text-primary">
          {session.title}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{session.room ?? "TBA"}</p>
        {session.speakers.length > 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            {session.speakers.map((speaker) => speaker.name).join(" · ")}
          </p>
        ) : null}
      </button>
      <div className="flex items-center justify-end px-3 pb-2">
        <button
          type="button"
          aria-label={bookmarked ? "Remove from My Flow" : "Add to My Flow"}
          aria-pressed={bookmarked}
          onClick={() => onToggleBookmark(session.id)}
          className={`rounded-lg p-2 transition-all hover:scale-110 ${
            bookmarked ? "text-pastel-yellow" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Bookmark className="h-5 w-5" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
