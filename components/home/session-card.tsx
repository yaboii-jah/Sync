"use client";

import { Card, Chip, ProgressBar, ToggleButton, Typography } from "@/components/ui";
import { Bookmark, Clock3, MapPin } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatDurationMinutes,
  relativeSessionLabel,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

interface SessionCardProps {
  session: SessionWithSpeakers;
  bookmarked: boolean;
  conflict?: boolean;
  now: number;
  onToggleBookmark: (sessionId: string) => void;
  onOpen: (session: SessionWithSpeakers) => void;
}

export function SessionCard({
  session,
  bookmarked,
  conflict = false,
  now,
  onToggleBookmark,
  onOpen,
}: SessionCardProps) {
  const status = effectiveSessionStatus(session, now);
  const startedAt = new Date(session.start_time).getTime();
  const endsAt = new Date(session.end_time).getTime();
  const duration = formatDurationMinutes((endsAt - startedAt) / 60_000);
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
  /*
   * One formatter for the whole line, so the card never mixes vocabularies.
   * An operator's end time wins when there is one; otherwise the clause is
   * about the start the attendee was promised.
   */
  const operatorEnd =
    session.status_override === "finished" ? session.actual_ended_at : null;
  const operatorStart =
    session.status_override === "ongoing" ? session.actual_started_at : null;
  const relative = relativeSessionLabel(
    operatorEnd ?? operatorStart ?? session.start_time,
    operatorEnd ? "end" : "start",
    now,
  );

  return (
    <Card
      id={`session-${session.id}`}
      variant={ongoing ? "secondary" : "default"}
      className={`squircle rounded-[20px] transition-transform active:scale-[0.98] motion-reduce:transform-none ${finished ? "opacity-60" : ""} ${ongoing ? "border border-success/50 bg-success/10 shadow-lg shadow-success/10 ring-1 ring-success/40" : ""}`}
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
          <div className="flex shrink-0 items-center gap-2">
            {conflict ? (
              <Chip size="sm" color="warning" variant="soft">
                Time conflict
              </Chip>
            ) : null}
            {ongoing ? null : <StatusBadge status={status} />}
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-muted">
          <Clock3 className="size-3.5 shrink-0" aria-hidden />
          <Typography
            type="body-sm"
            color="muted"
            className="tabular-nums"
            suppressHydrationWarning
          >
            {duration} · {relative}
          </Typography>
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <Typography type="body-sm" color="muted" className="truncate">
            {session.room ?? "TBA"}
            {session.speakers.length > 0
              ? ` · ${session.speakers.map((speaker) => speaker.name).join(", ")}`
              : ""}
          </Typography>
        </div>

        {/* A running session shows how far through it is, matching the hero. */}
        {ongoing ? (
          <ProgressBar
            value={elapsedPct}
            aria-label="Session progress"
            className="mt-3"
          >
            <ProgressBar.Track className="bg-separator h-1 rounded-full">
                <ProgressBar.Fill
                  className="bg-success rounded-full"
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
