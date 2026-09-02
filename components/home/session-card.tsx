"use client";

import { Card, ToggleButton, Typography } from "@heroui/react";
import { Bookmark } from "lucide-react";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatRelativeTime,
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
  const status = effectiveSessionStatus(session, now);
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
      className={`relative overflow-hidden ${finished ? "opacity-60" : ""}`}
    >
      {ongoing ? (
        <span
          aria-hidden
          className="bg-foreground absolute inset-y-0 left-0 w-1"
        />
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(session)}
        aria-haspopup="dialog"
        className="w-full px-5 py-4 text-left"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Typography type="body-sm" color="muted" suppressHydrationWarning>
            {formatTimeRange(session.start_time, session.end_time)}
            {relative ? ` · ${relative}` : ""}
          </Typography>
          <StatusBadge status={status} />
        </div>

        <Typography type="h6" className="mt-2">
          {session.title}
        </Typography>

        <Typography type="body-sm" color="muted" className="mt-1">
          {session.room ?? "TBA"}
        </Typography>

        {session.status_override ? (
          <Typography type="body-xs" color="muted" className="mt-2">
            Live status updated by event operations
          </Typography>
        ) : null}

        {session.speakers.length > 0 ? (
          <Typography type="body-sm" color="muted" className="mt-2">
            {session.speakers.map((speaker) => speaker.name).join(", ")}
          </Typography>
        ) : null}
      </button>

      {!finished ? (
        <div className="flex items-center justify-end px-3 pb-3">
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
