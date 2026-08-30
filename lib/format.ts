const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return RELATIVE_FORMAT.format(diffSeconds, "second");
  if (abs < 3600) return RELATIVE_FORMAT.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return RELATIVE_FORMAT.format(Math.round(diffSeconds / 3600), "hour");
  return RELATIVE_FORMAT.format(Math.round(diffSeconds / 86400), "day");
}

export type DisplayStatus = "not_started" | "ongoing" | "finished";

export function formatManilaTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function formatManilaDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string): string {
  return `${TIME_FORMAT.format(new Date(startIso))} – ${TIME_FORMAT.format(new Date(endIso))}`;
}

export function displayStatus(
  startIso: string,
  endIso: string,
  now: number = Date.now(),
): DisplayStatus {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (now < start) return "not_started";
  if (now >= end) return "finished";
  return "ongoing";
}

export function effectiveSessionStatus(
  session: {
    status: string;
    status_override: string | null;
    start_time: string;
    end_time: string;
  },
  now: number = Date.now(),
): DisplayStatus {
  if (
    session.status_override &&
    (session.status === "not_started" ||
      session.status === "ongoing" ||
      session.status === "finished")
  ) {
    return session.status;
  }
  return displayStatus(session.start_time, session.end_time, now);
}

export function relativeStartLabel(
  startIso: string,
  now: number = Date.now(),
): string | null {
  const diffMs = new Date(startIso).getTime() - now;
  const absMinutes = Math.abs(Math.round(diffMs / 60000));

  if (diffMs > 0) {
    if (absMinutes < 1) return "starting now";
    if (absMinutes < 60) return `in ${absMinutes} min`;
    const hours = Math.floor(absMinutes / 60);
    if (hours < 24) return `in ${hours} hr`;
    return `in ${Math.floor(hours / 24)} d`;
  }

  if (absMinutes < 1) return "just started";
  if (absMinutes < 60) return `started ${absMinutes} min ago`;
  const hours = Math.floor(absMinutes / 60);
  if (hours < 24) return `started ${hours} hr ago`;
  return null;
}
