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

/**
 * The session card's one time vocabulary: the abbreviations `min`, `hr` and
 * `d`. Both the duration and the relative clause below spell magnitudes this
 * way so a card never mixes `9 hours ago` with `in 4 d`.
 */

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/**
 * A session's length, readable at any length: `45 min`, `2 hr 30 min`,
 * `4 d 23 hr`. Below two hours it stays in minutes, because that is how a
 * programme is read; past that a bare minute count stops being a quantity a
 * reader can picture.
 *
 * A negative or non-finite span comes from bad data, not from a session, so it
 * renders as `0 min` rather than throwing inside a card.
 */
export function formatDurationMinutes(minutes: number): string {
  const total = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;

  if (total < 2 * MINUTES_PER_HOUR) return `${total} min`;

  if (total < MINUTES_PER_DAY) {
    const hours = Math.floor(total / MINUTES_PER_HOUR);
    const rest = total % MINUTES_PER_HOUR;
    return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
  }

  const days = Math.floor(total / MINUTES_PER_DAY);
  const rest = Math.floor((total % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  return rest === 0 ? `${days} d` : `${days} d ${rest} hr`;
}

/**
 * Which milestone a relative clause is about. The card reads an operator's
 * `actual_ended_at` as an end and everything else as a start.
 */
export type SessionTimeAnchor = "start" | "end";

/** Single-unit magnitude for a relative clause: `2 min`, `5 hr`, `3 d`. */
function relativeMagnitude(absMinutes: number): string {
  if (absMinutes < MINUTES_PER_HOUR) return `${absMinutes} min`;
  const hours = Math.floor(absMinutes / MINUTES_PER_HOUR);
  if (hours < 24) return `${hours} hr`;
  return `${Math.floor(hours / 24)} d`;
}

/**
 * The card's one relative-time formatter, for past and future alike. It always
 * returns a clause: an instant more than a day old used to return `null`, which
 * left a card showing a bare duration with nothing to anchor it.
 *
 * `formatRelativeTime` stays as it is for the admin console and `/alerts`,
 * which speak the longer `9 hours ago` vocabulary.
 */
export function relativeSessionLabel(
  iso: string,
  anchor: SessionTimeAnchor = "start",
  now: number = Date.now(),
): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return anchor === "end" ? "ended" : "scheduled";

  const diffMs = target - now;
  const absMinutes = Math.abs(Math.round(diffMs / 60000));

  if (diffMs > 0) {
    if (absMinutes < 1) return anchor === "end" ? "ending now" : "starting now";
    return `in ${relativeMagnitude(absMinutes)}`;
  }

  if (absMinutes < 1) return anchor === "end" ? "just ended" : "just started";
  const verb = anchor === "end" ? "ended" : "started";
  return `${verb} ${relativeMagnitude(absMinutes)} ago`;
}
