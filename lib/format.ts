export const EVENT_TIME_ZONE = "Asia/Manila";

const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: EVENT_TIME_ZONE,
});

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: EVENT_TIME_ZONE,
});

const MANILA_DATE_TIME_INPUT_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: EVENT_TIME_ZONE,
});

const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

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

/** Format an instant for an event-time `datetime-local` input in Manila time. */
export function formatManilaDateTimeInput(iso: string): string {
  const parts = Object.fromEntries(
    MANILA_DATE_TIME_INPUT_FORMAT
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Parse a `datetime-local` value as an Asia/Manila wall-clock time. */
export function parseManilaDateTimeInput(value: string): string | null {
  const match = value.match(DATE_TIME_INPUT_PATTERN);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHour = Number(hour);
  const numericMinute = Number(minute);

  if (
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > 31 ||
    numericHour > 23 ||
    numericMinute > 59
  ) {
    return null;
  }

  const instant = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
  if (Number.isNaN(instant.getTime())) return null;

  // Date normalizes impossible dates such as February 30; reject those rather
  // than silently moving the session to a different wall-clock day.
  if (formatManilaDateTimeInput(instant.toISOString()) !== value) return null;

  return instant.toISOString();
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
