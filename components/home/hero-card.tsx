"use client";

import type { EventInfo, SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
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
      <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-6 text-center">
        <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
          {event.name}
        </p>
        <p className="mt-3 font-display text-3xl text-text-primary uppercase">
          That&apos;s a wrap
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Thanks for coming — see you at the next one.
        </p>
      </div>
    );
  }

  if (current) {
    return (
      <div className="relative rounded-2xl border border-border-default bg-bg-base px-5 py-6 shadow-[0_0_28px_rgba(188,131,48,0.35)]">
        <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">
          Happening Now
        </p>
        <h1 className="mt-2 font-display text-3xl text-text-primary uppercase">
          {current.title}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {current.room ?? "TBA"} · {formatTimeRange(current.start_time, current.end_time)}
        </p>
        {current.status_override && current.actual_started_at ? (
          <p className="mt-2 text-xs font-bold tracking-wide text-pastel-yellow uppercase">
            Started live at {new Intl.DateTimeFormat("en-PH", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "Asia/Manila",
            }).format(new Date(current.actual_started_at))}
          </p>
        ) : null}
      </div>
    );
  }

  const next = sessions.find(
    (session) => effectiveSessionStatus(session, now) === "not_started",
  );

  if (next && now >= startsAt) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-6 text-center">
        <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
          Up Next
        </p>
        <p className="mt-3 font-display text-2xl text-text-primary uppercase">
          {next.title}
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {formatTimeRange(next.start_time, next.end_time)} · {next.room ?? "TBA"}
        </p>
      </div>
    );
  }

  if (now >= startsAt) {
    return (
      <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-6 text-center">
        <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
          Program update
        </p>
        <p className="mt-3 font-display text-2xl text-text-primary uppercase">
          No session is live
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Check the program flow for the latest event status.
        </p>
      </div>
    );
  }

  const remaining = startsAt - now;
  const parts = countdownParts(remaining);
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-6 text-center">
      <p className="text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
        {formatManilaDate(event.starts_at)}
      </p>
      <p className="mt-2 font-display text-3xl text-text-primary uppercase">
        Starts In
      </p>
      <div className="mt-4 flex items-start justify-center gap-3 font-display text-4xl text-pastel-yellow [text-shadow:0_0_18px_rgba(252,219,100,0.4)]">
        {[
          ["D", parts.days],
          ["H", parts.hours],
          ["M", parts.minutes],
          ["S", parts.seconds],
        ].map(([label, value]) => (
          <span key={label} className="flex flex-col items-center">
            {pad(Number(value))}
            <span className="mt-1 text-[0.6rem] font-sans font-bold tracking-widest text-text-muted">
              {label}
            </span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-text-muted">{event.venue}</p>
    </div>
  );
}
