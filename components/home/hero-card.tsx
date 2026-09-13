"use client";

import { Card, Link, ProgressBar, Separator, Typography } from "@/components/ui";
import { ExternalLink, MapPin } from "lucide-react";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { formatEventDate, formatEventTime, formatEventTimeRange } from "@/lib/format";
import { getLiveSessions, getNextSessions } from "@/lib/program-flow";

interface HeroCardProps {
  event: EventInfo;
  sessions: SessionWithSpeakers[];
  now: number;
  /** Opens the session detail sheet. Absent for the states with no session. */
  onOpenSession?: (session: SessionWithSpeakers) => void;
}

const heroSurface =
  "event-hero squircle relative overflow-hidden rounded-[28px] p-5 sm:p-6";
const heroTitle = "text-foreground text-2xl font-semibold tracking-tight";
const heroMuted = "text-muted";
const fallbackVenue = "Venue TBA";

/**
 * Google Maps search for the event venue. The name is percent-encoded, so a
 * venue containing `&` or `#` stays inside the `query` parameter instead of
 * truncating the URL.
 */
function venueMapUrl(venue: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

function HeroTheme({ theme }: { theme: string }) {
  return (
      <Card.Description className="w-full text-center text-xs font-semibold tracking-[0.14em] text-accent uppercase">
      {theme}
    </Card.Description>
  );
}

/**
 * Time left in a running session, live-activity style: a ticking `mm:ss` in the
 * final hour, coarser above that where seconds are noise rather than news.
 */
function remainingLabel(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (total === 0) return "Wrapping up";
  if (hours > 0) return `${hours} hr ${minutes} min left`;
  return `${minutes}:${String(seconds).padStart(2, "0")} left`;
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

function HeroSessionItem({
  session,
  now,
  live,
  timeZone,
  onOpenSession,
}: {
  session: SessionWithSpeakers;
  now: number;
  live: boolean;
  timeZone: string;
  onOpenSession?: (session: SessionWithSpeakers) => void;
}) {
  const sessionStart = new Date(session.start_time).getTime();
  const sessionEnd = new Date(session.end_time).getTime();
  const nowMinute = Math.floor(now / 60_000) * 60_000;
  const elapsedPct = Math.min(
    100,
    Math.max(
      0,
      ((nowMinute - sessionStart) / (sessionEnd - sessionStart)) * 100,
    ),
  );

  const content = (
    <div className="flex flex-col gap-2 rounded-2xl border border-foreground/10 bg-background/45 p-3.5 backdrop-blur-sm">
      <Typography type="body" weight="semibold" className="leading-snug text-foreground">
        {session.title}
      </Typography>
      <Typography type="body-xs" className={`tabular-nums ${heroMuted}`}>
        {formatEventTimeRange(session.start_time, session.end_time, timeZone)}
        {" · "}
        {session.room ?? "TBA"}
      </Typography>

      {live ? (
        <>
          <ProgressBar
            value={elapsedPct}
            aria-label={`${session.title} progress`}
            className="mt-1"
          >
            <ProgressBar.Track className="h-1.5 rounded-full bg-background/65">
              <ProgressBar.Fill
                className="bg-success rounded-full"
                suppressHydrationWarning
              />
            </ProgressBar.Track>
          </ProgressBar>
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="text-foreground text-sm font-semibold tabular-nums"
              suppressHydrationWarning
            >
              {remainingLabel(sessionEnd - now)}
            </span>
            <span className={`text-xs ${heroMuted}`}>
              ends {formatEventTime(session.end_time, timeZone)}
            </span>
          </div>
          {session.status_override && session.actual_started_at ? (
            <Typography type="body-xs" className={heroMuted}>
              Started live at{" "}
              {new Intl.DateTimeFormat("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                timeZone,
              }).format(new Date(session.actual_started_at))}
            </Typography>
          ) : null}
        </>
      ) : null}
    </div>
  );

  if (!onOpenSession) return content;

  return (
    <button
      type="button"
      onClick={() => onOpenSession(session)}
      aria-haspopup="dialog"
      aria-label={`Open ${session.title}`}
      className="w-full text-left transition-transform active:scale-[0.98] motion-reduce:transform-none"
    >
      {content}
    </button>
  );
}

export function HeroCard({
  event,
  sessions,
  now,
  onOpenSession,
}: HeroCardProps) {
  const startsAt = new Date(event.starts_at).getTime();
  const endsAt = new Date(event.ends_at).getTime();

  const current = getLiveSessions(sessions, now);

  if (current.length === 0 && now >= endsAt) {
    return (
      <Card className={heroSurface}>
        <Card.Header className="relative z-10">
          <HeroTheme theme={event.theme} />
        <Card.Title className={heroTitle}>That is a wrap</Card.Title>
        </Card.Header>
        <Card.Content className="relative z-10 pt-4">
          <Typography type="body-sm" className={heroMuted}>
            Thanks for coming. See you at the next one.
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  if (current.length > 0) {
    return (
      <Card className={heroSurface}>
        <Card.Header className="relative z-10">
          <HeroTheme theme={event.theme} />
          <div className="mt-2 flex items-center gap-2">
            <span aria-hidden className="relative flex size-2 shrink-0">
              <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
              <span className="bg-success relative inline-flex size-2 rounded-full" />
            </span>
            <span className="text-success text-[11px] font-semibold tracking-[0.08em] uppercase">
              Happening now
              {current.length > 1 ? ` · ${current.length} sessions` : ""}
            </span>
          </div>
        </Card.Header>
        <Card.Content className="relative z-10 flex flex-col gap-3 pt-4">
          {current.map((session, index) => (
            <div key={session.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator className="bg-border/45" /> : null}
              <HeroSessionItem
                session={session}
                now={now}
                live
                timeZone={event.timezone}
                onOpenSession={onOpenSession}
              />
            </div>
          ))}
        </Card.Content>
      </Card>
    );
  }

  const next = getNextSessions(sessions, now);

  if (next.length > 0 && now >= startsAt) {
    return (
      <Card className={heroSurface}>
        <Card.Header className="relative z-10">
          <HeroTheme theme={event.theme} />
          <Card.Title className={`mt-1 ${heroTitle}`}>Up next</Card.Title>
        </Card.Header>
        <Card.Content className="relative z-10 flex flex-col gap-3 pt-4">
          {next.map((session, index) => (
            <div key={session.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator className="bg-border/45" /> : null}
              <HeroSessionItem
                session={session}
                now={now}
                live={false}
                timeZone={event.timezone}
                onOpenSession={onOpenSession}
              />
            </div>
          ))}
        </Card.Content>
      </Card>
    );
  }

  if (now >= startsAt) {
    return (
      <Card className={heroSurface}>
        <Card.Header className="relative z-10">
          <HeroTheme theme={event.theme} />
          <Card.Title className={heroTitle}>No session is live</Card.Title>
        </Card.Header>
        <Card.Content className="relative z-10 pt-4">
          <Typography type="body-sm" className={heroMuted}>
            Check the program flow for the latest event status.
          </Typography>
        </Card.Content>
      </Card>
    );
  }

  const venue = event.venue ?? fallbackVenue;
  const parts = countdownParts(startsAt - now);
  const pad = (value: number) => String(value).padStart(2, "0");
  const units: [string, number][] = [
    ["Days", parts.days],
    ["Hrs", parts.hours],
    ["Min", parts.minutes],
    ["Sec", parts.seconds],
  ];

  return (
    <Card className={heroSurface}>
        <Card.Header className="relative z-10">
        <HeroTheme theme={event.theme} />
        <Card.Title className={`mt-1 ${heroTitle}`}>Starts in</Card.Title>
      </Card.Header>
        <Card.Content className="relative z-10 pt-4">
        <Typography type="body-xs" className={heroMuted}>
          {formatEventDate(event.starts_at, event.timezone)}
        </Typography>
        <div
          className="grid grid-cols-4 gap-2"
          suppressHydrationWarning
          role="timer"
          aria-label="Time until the event starts"
        >
          {units.map(([label, value]) => (
            <div
              key={label}
              className="flex min-w-0 flex-col items-center rounded-2xl border border-foreground/10 bg-background/45 px-2 py-3 backdrop-blur-sm"
            >
              <span className="text-foreground text-2xl font-semibold tabular-nums">
                {pad(value)}
              </span>
              <Typography type="body-xs" className={`mt-1 ${heroMuted}`}>
                {label}
              </Typography>
            </div>
          ))}
        </div>
      </Card.Content>
       <Card.Footer className="relative z-10 pt-5">
        <Link
          href={venueMapUrl(venue)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${venue} in Google Maps`}
          className={`flex min-w-0 items-center gap-2 ${heroMuted} transition-opacity hover:opacity-100`}
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{venue}</span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </Link>
      </Card.Footer>
    </Card>
  );
}
