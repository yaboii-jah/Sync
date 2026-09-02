"use client";

import { Card, ProgressBar, Typography } from "@heroui/react";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  effectiveSessionStatus,
  formatManilaDate,
  formatManilaTime,
  formatTimeRange,
} from "@/lib/format";

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

/**
 * Wraps the hero in a button when it represents a real session, so the card
 * opens the same detail sheet its list cell does. The states that describe the
 * event rather than a session (countdown, wrap, no-session) stay static.
 */
function Pressable({
  session,
  onOpenSession,
  children,
}: {
  session: SessionWithSpeakers;
  onOpenSession?: (session: SessionWithSpeakers) => void;
  children: React.ReactNode;
}) {
  if (!onOpenSession) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => onOpenSession(session)}
      aria-haspopup="dialog"
      className="squircle w-full rounded-[24px] text-left transition-transform active:scale-[0.98] motion-reduce:transform-none"
    >
      {children}
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

  const current = sessions.find(
    (session) => effectiveSessionStatus(session, now) === "ongoing",
  );

  if (!current && now >= endsAt) {
    return (
      <Card className={heroSurface}>
        <Card.Header>
          <Card.Description className={heroMuted}>
            {event.name}
          </Card.Description>
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

  if (current) {
    const sessionStart = new Date(current.start_time).getTime();
    const sessionEnd = new Date(current.end_time).getTime();
    /*
     * Quantised to the minute so the server render and client hydration agree
     * (`now` is Date.now() on each side); a talk's progress doesn't need
     * per-second resolution anyway.
     */
    const nowMinute = Math.floor(now / 60_000) * 60_000;
    const remaining = remainingLabel(sessionEnd - now);
    const elapsedPct = Math.min(
      100,
      Math.max(
        0,
        ((nowMinute - sessionStart) / (sessionEnd - sessionStart)) * 100,
      ),
    );

    return (
      <Pressable session={current} onOpenSession={onOpenSession}>
        <Card className={heroSurface}>
          <Card.Header>
            {/*
             * Eyebrow + live dot instead of a solid chip: the dot is real state
             * (a session is running), and the quiet label lets the title carry
             * the card.
             */}
            <div className="flex items-center gap-2">
              <span aria-hidden className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-white" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.08em] text-white/85 uppercase">
                Happening now
              </span>
            </div>
            <Card.Title className={`mt-2 text-xl leading-snug ${heroTitle}`}>
              {current.title}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-1">
            <Typography type="body-sm" className={`tabular-nums ${heroMuted}`}>
              {formatTimeRange(current.start_time, current.end_time)}
              {" · "}
              {current.room ?? "TBA"}
            </Typography>
            {/* Session progress, live-activity style: how far along the talk is. */}
            <ProgressBar
              value={elapsedPct}
              aria-label="Session progress"
              className="mt-2"
            >
              <ProgressBar.Track className="h-1 rounded-full bg-white/25">
                {/* `now` ticks client-side, so the fill width differs from the
                  server render by design — same suppression as the time text. */}
                <ProgressBar.Fill
                  className="rounded-full bg-white"
                  suppressHydrationWarning
                />
              </ProgressBar.Track>
            </ProgressBar>
            {/* The bar shows how far along; the countdown says how long left. */}
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <span
                className="text-sm font-semibold text-white tabular-nums"
                suppressHydrationWarning
              >
                {remaining}
              </span>
              <span className={`text-xs ${heroMuted}`}>
                ends {formatManilaTime(current.end_time)}
              </span>
            </div>
            {current.status_override && current.actual_started_at ? (
              <Typography type="body-xs" className={`mt-1 ${heroMuted}`}>
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
      </Pressable>
    );
  }

  const next = sessions.find(
    (session) => effectiveSessionStatus(session, now) === "not_started",
  );

  if (next && now >= startsAt) {
    return (
      <Pressable session={next} onOpenSession={onOpenSession}>
        <Card className={heroSurface}>
          <Card.Header>
            <Card.Description
              className={`text-[11px] font-semibold tracking-[0.08em] uppercase ${heroMuted}`}
            >
              Up next
            </Card.Description>
            <Card.Title className={`mt-1 text-xl leading-snug ${heroTitle}`}>
              {next.title}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-1">
            <Typography type="body-sm" className={`tabular-nums ${heroMuted}`}>
              {formatTimeRange(next.start_time, next.end_time)}
              {" · "}
              {next.room ?? "TBA"}
            </Typography>
          </Card.Content>
        </Card>
      </Pressable>
    );
  }

  if (now >= startsAt) {
    return (
      <Card className={heroSurface}>
        <Card.Header>
          <Card.Description className={heroMuted}>
            Program update
          </Card.Description>
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
        <Card.Description
          className={`text-[11px] font-semibold tracking-[0.08em] uppercase ${heroMuted}`}
        >
          {formatManilaDate(event.starts_at)}
        </Card.Description>
        <Card.Title className={`mt-1 ${heroTitle}`}>Starts in</Card.Title>
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
        <Typography type="body-sm" className={heroMuted}>
          {event.venue}
        </Typography>
      </Card.Footer>
    </Card>
  );
}
