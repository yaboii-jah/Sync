"use client";

import { Card, Link, ProgressBar, Separator, Typography } from "@heroui/react";
import { ExternalLink, MapPin } from "lucide-react";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  formatManilaDate,
  formatManilaTime,
  formatTimeRange,
} from "@/lib/format";
import { getLiveSessions, getNextSessions } from "@/lib/program-flow";

interface HeroCardProps {
  event: EventInfo;
  sessions: SessionWithSpeakers[];
  now: number;
  /** Opens the session detail sheet. Absent for the states with no session. */
  onOpenSession?: (session: SessionWithSpeakers) => void;
}

/*
 * The hero is the one dramatic surface on the screen — a saturated accent
 * gradient the way iOS feature cards work (Music's now-playing, Fitness,
 * App Store "Today"), while every other card stays a quiet grouped cell.
 * Solid gradient, no translucency; text is white with opacity steps rather
 * than the theme's muted token, which would vanish on the blue.
 */
const heroSurface =
  "squircle rounded-[24px] border-none bg-linear-to-br from-[#00369c] via-[#0053d6] to-[#0072f5] shadow-xl shadow-[#0053d6]/25";
const heroTitle = "text-white";
const heroMuted = "text-white/75";
const venueMapUrl =
  "https://www.google.com/maps/search/?api=1&query=Asia+Pacific+College";

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
  onOpenSession,
}: {
  session: SessionWithSpeakers;
  now: number;
  live: boolean;
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
    <div className="flex flex-col gap-1.5 rounded-xl bg-white/10 p-3">
      <Typography type="body" weight="semibold" className="leading-snug text-white">
        {session.title}
      </Typography>
      <Typography type="body-xs" className={`tabular-nums ${heroMuted}`}>
        {formatTimeRange(session.start_time, session.end_time)}
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
            <ProgressBar.Track className="h-1 rounded-full bg-white/25">
              <ProgressBar.Fill
                className="rounded-full bg-white"
                suppressHydrationWarning
              />
            </ProgressBar.Track>
          </ProgressBar>
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="text-sm font-semibold text-white tabular-nums"
              suppressHydrationWarning
            >
              {remainingLabel(sessionEnd - now)}
            </span>
            <span className={`text-xs ${heroMuted}`}>
              ends {formatManilaTime(session.end_time)}
            </span>
          </div>
          {session.status_override && session.actual_started_at ? (
            <Typography type="body-xs" className={heroMuted}>
              Started live at{" "}
              {new Intl.DateTimeFormat("en-PH", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Manila",
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
        <Card.Header>
          <Card.Description className={heroMuted}>{event.theme}</Card.Description>
          <Card.Title className={heroTitle}>That is a wrap</Card.Title>
        </Card.Header>
        <Card.Content>
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
        <Card.Header>
          <Card.Description className={heroMuted}>{event.theme}</Card.Description>
          <div className="mt-2 flex items-center gap-2">
            <span aria-hidden className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] text-white/85 uppercase">
              Happening now
              {current.length > 1 ? ` · ${current.length} sessions` : ""}
            </span>
          </div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {current.map((session, index) => (
            <div key={session.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator className="bg-white/15" /> : null}
              <HeroSessionItem
                session={session}
                now={now}
                live
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
        <Card.Header>
          <Card.Description className={heroMuted}>{event.theme}</Card.Description>
          <Card.Title className={`mt-1 ${heroTitle}`}>Up next</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          {next.map((session, index) => (
            <div key={session.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator className="bg-white/15" /> : null}
              <HeroSessionItem
                session={session}
                now={now}
                live={false}
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
        <Card.Header>
          <Card.Description className={heroMuted}>{event.theme}</Card.Description>
          <Card.Title className={heroTitle}>No session is live</Card.Title>
        </Card.Header>
        <Card.Content>
          <Typography type="body-sm" className={heroMuted}>
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
    <Card className={heroSurface}>
      <Card.Header>
        <Card.Description className={heroMuted}>{event.theme}</Card.Description>
        <Card.Title className={`mt-1 ${heroTitle}`}>Starts in</Card.Title>
      </Card.Header>
      <Card.Content>
        <Typography type="body-xs" className={heroMuted}>
          {formatManilaDate(event.starts_at)}
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
              className="flex flex-col items-center rounded-xl bg-white/15 px-2 py-3"
            >
              <span className="text-2xl font-semibold text-white tabular-nums">
                {pad(value)}
              </span>
              <Typography type="body-xs" className={`mt-1 ${heroMuted}`}>
                {label}
              </Typography>
            </div>
          ))}
        </div>
      </Card.Content>
      <Card.Footer>
        <Typography type="body-sm" className={`lg:hidden ${heroMuted}`}>
          {event.venue ?? "Asia Pacific College"}
        </Typography>
        <Link
          href={venueMapUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open Asia Pacific College in Google Maps"
          className={`hidden min-w-0 items-center gap-2 ${heroMuted} transition-opacity hover:opacity-100 lg:flex`}
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {event.venue ?? "Asia Pacific College"}
          </span>
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </Link>
      </Card.Footer>
    </Card>
  );
}
