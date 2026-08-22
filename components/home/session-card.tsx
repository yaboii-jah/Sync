"use client";

import { Bookmark } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { displayStatus, formatTimeRange } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

interface SessionCardProps {
  session: SessionWithSpeakers;
  bookmarked: boolean;
  onToggleBookmark: (sessionId: string) => void;
  onOpen: (session: SessionWithSpeakers) => void;
}

export function SessionCard({
  session,
  bookmarked,
  onToggleBookmark,
  onOpen,
}: SessionCardProps) {
  const status = displayStatus(session.start_time, session.end_time);

  return (
    <article className="rounded-2xl border border-border-default bg-bg-base">
      <button
        type="button"
        onClick={() => onOpen(session)}
        className="w-full px-4 py-4 text-left"
        aria-haspopup="dialog"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
            {formatTimeRange(session.start_time, session.end_time)}
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
          className={`rounded-lg p-2 transition-colors ${
            bookmarked ? "text-pastel-yellow" : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Bookmark className="h-5 w-5" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
