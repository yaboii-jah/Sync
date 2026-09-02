"use client";

import { Card, Chip, Typography } from "@heroui/react";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatManilaDate,
  formatTimeRange,
} from "@/lib/format";

interface HeroCardProps {
  event: EventInfo;
  sessions: SessionWithSpeakers[];
  now: number;
}

function countdownParts(msRemaining: number) {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function HeroCard({ event, sessions, now }: HeroCardProps) {
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = new Date(event.ends_at).getTime();

  const current = sessions.find(
    (session) => effectiveSessionStatus(session, now) === "ongoing",
  );

  if (!current && now >= endsAt) {
    return (
      <Card>
        <Card.Header>
          <Card.Description>{event.name}</Card.Description>
          <Card.Title>That is a wrap</Card.Title>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            Thanks for coming. See you at the next one.
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  if (current) {
    return (
      <Card variant="secondary">
        <Card.Header>
          <Chip size="sm" variant="primary">
            Happening now
          </Chip>
          <Card.Title className="mt-2">{current.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-1">
          <Typography type="body-sm" color="muted">
            {formatTimeRange(current.start_time, current.end_time)}
          </Typography>
          <Typography type="body-sm" color="muted">
            {current.room ?? "TBA"}
          </Typography>
          {current.status_override && current.actual_started_at ? (
            <Typography type="body-xs" color="muted" className="mt-1">
              Started live at{" "}
              {new Intl.DateTimeFormat("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Manila",
              }).format(new Date(current.actual_started_at))}
            </Typography>
          ) : null}
        </Card.Content>
      </Card>
    );
  }

  const next = sessions.find(
    (session) => effectiveSessionStatus(session, now) === "not_started",
  );

  if (next && now >= startsAt) {
    return (
      <Card>
        <Card.Header>
          <Card.Description>Up next</Card.Description>
          <Card.Title>{next.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-1">
          <Typography type="body-sm" color="muted">
            {formatTimeRange(next.start_time, next.end_time)}
          </Typography>
          <Typography type="body-sm" color="muted">
            {next.room ?? "TBA"}
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  if (now >= startsAt) {
    return (
      <Card>
        <Card.Header>
          <Card.Description>Program update</Card.Description>
          <Card.Title>No session is live</Card.Title>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" color="muted">
            Check the program flow for the latest event status.
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  const parts = countdownParts(startsAt - now);
  const pad = (value: number) => String(value).padStart(2, "0");
  const units: [string, number][] = [
    ["Days", parts.days],
    ["Hrs", parts.hours],
    ["Min", parts.minutes],
    ["Sec", parts.seconds],
  ];

  return (
    <Card>
      <Card.Header>
        <Card.Description>{formatManilaDate(event.starts_at)}</Card.Description>
        <Card.Title>Starts in</Card.Title>
      </Card.Header>
      <Card.Content>
        <div
          className="grid grid-cols-4 gap-2"
          suppressHydrationWarning
          role="timer"
          aria-label="Time until the event starts"
        >
          {units.map(([label, value]) => (
            <div
              key={label}
              className="bg-surface-secondary flex flex-col items-center rounded-lg px-2 py-3"
            >
              <span className="text-2xl font-semibold tabular-nums">
                {pad(value)}
              </span>
              <Typography type="body-xs" color="muted" className="mt-1">
                {label}
              </Typography>
            </div>
          ))}
        </div>
      </Card.Content>
      <Card.Footer>
        <Typography type="body-sm" color="muted">
          {event.venue}
        </Typography>
      </Card.Footer>
    </Card>
  );
}
