"use client";

import { Card, ProgressBar, ToggleButton, Typography } from "@heroui/react";
import { Bookmark } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatRelativeTime,
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
  const status = effectiveSessionStatus(session, now);
  const startedAt = new Date(session.start_time).getTime();
  const endsAt = new Date(session.end_time).getTime();
  const durationMinutes = Math.round((endsAt - startedAt) / 60_000);
  /*
   * Quantised to the minute so the server and client renders agree — the same
   * reason the hero's bar is. A talk needs no finer resolution than that.
   */
  const nowMinute = Math.floor(now / 60_000) * 60_000;
  const elapsedPct = Math.min(
    100,
    Math.max(0, ((nowMinute - startedAt) / (endsAt - startedAt)) * 100),
  );
  const ongoing = status === "ongoing";
  const finished = status === "finished";
  const relative =
    session.status_override === "finished" && session.actual_ended_at
      ? `ended ${formatRelativeTime(session.actual_ended_at, now)}`
      : relativeStartLabel(
          session.status_override === "ongoing" && session.actual_started_at
            ? session.actual_started_at
            : session.start_time,
          now,
        );

  return (
    <Card
      id={`session-${session.id}`}
      variant={ongoing ? "secondary" : "default"}
      className={`squircle rounded-[20px] transition-transform active:scale-[0.98] motion-reduce:transform-none ${finished ? "opacity-60" : ""} ${ongoing ? "ring-accent/50 ring-1" : ""}`}
    >
      {/*
        * Title leads, the way an iOS list cell reads: what it is, then when,
        * then where/who — each a single footnote line with dot separators
        * instead of a stack of one-fact-per-row lines.
        */}
      <button
        type="button"
        onClick={() => onOpen(session)}
        aria-haspopup="dialog"
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <Typography type="h6" className="min-w-0 flex-1 leading-snug">
            {session.title}
          </Typography>
          {/* The time header already flags a live session; showing "Ongoing"
              here as well says the same thing twice. */}
          {ongoing ? null : <StatusBadge status={status} />}
        </div>

        <Typography
          type="body-sm"
          color="muted"
          className="mt-1.5 tabular-nums"
          suppressHydrationWarning
        >
          {durationMinutes} min
          {relative ? ` · ${relative}` : ""}
        </Typography>

        <Typography type="body-sm" color="muted" className="mt-0.5 truncate">
          {session.room ?? "TBA"}
          {session.speakers.length > 0
            ? ` · ${session.speakers.map((speaker) => speaker.name).join(", ")}`
            : ""}
        </Typography>

        {/* A running session shows how far through it is, matching the hero. */}
        {ongoing ? (
          <ProgressBar
            value={elapsedPct}
            aria-label="Session progress"
            className="mt-3"
          >
            <ProgressBar.Track className="bg-separator h-1 rounded-full">
              <ProgressBar.Fill
                className="bg-accent rounded-full"
                suppressHydrationWarning
              />
            </ProgressBar.Track>
          </ProgressBar>
        ) : null}

        {session.status_override ? (
          <Typography type="body-xs" color="muted" className="mt-1.5">
            Live status updated by event operations
          </Typography>
        ) : null}
      </button>

      {!finished ? (
        <div className="-mt-3 flex items-center justify-end px-2 pb-2">
          <ToggleButton
            isIconOnly
            size="sm"
            variant="ghost"
            isSelected={bookmarked}
            onChange={() => onToggleBookmark(session.id)}
            aria-label={bookmarked ? "Remove from My Flow" : "Add to My Flow"}
          >
            <Bookmark
              className="size-5"
              aria-hidden
              fill={bookmarked ? "currentColor" : "none"}
            />
          </ToggleButton>
        </div>
      ) : null}
    </Card>
  );
}
