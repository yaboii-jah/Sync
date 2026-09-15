import { normalizeEventSlug } from "./routing";

export interface EventBasicsInput {
  name: string;
  slug: string;
  description: string;
  venue: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
}

export type EventBasicsErrors = Partial<Record<keyof EventBasicsInput, string>>;

export function suggestEventSlug(name: string): string {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 80).replace(/-$/, "");
}

export function isEventTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return timezone.includes("/") || timezone === "UTC";
  } catch { return false; }
}

/** Formats wall-clock input without using the machine/browser's timezone. */
export function formatEventDateTimeInput(instant: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const part = (key: string) => parts.find((item) => item.type === key)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Rejects DST gaps AND repeated wall times instead of choosing a hidden offset. */
export function parseEventDateTimeInput(value: string, timezone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !isEventTimeZone(timezone)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0, 16) !== value) return null;
  const offsets = new Set<number>();
  // Sample both sides of nearby transitions, including non-hour offsets.
  for (let hour = -48; hour <= 48; hour += 6) {
    const sample = wall + hour * 3_600_000;
    const local = formatEventDateTimeInput(new Date(sample).toISOString(), timezone);
    offsets.add(Date.parse(`${local}:00Z`) - sample);
  }
  const matches = [...offsets].map((offset) => wall - offset)
    .filter((candidate) => formatEventDateTimeInput(new Date(candidate).toISOString(), timezone) === value);
  return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
}

export function validateEventBasics(input: EventBasicsInput, creating: boolean) {
  const errors: EventBasicsErrors = {};
  if (input.name.trim().length < 1 || input.name.trim().length > 160) errors.name = "Use an event name between 1 and 160 characters.";
  const slug = normalizeEventSlug(input.slug);
  if (creating && !slug) errors.slug = "Use 3–80 lowercase letters, numbers, and single hyphens.";
  if (input.description.length > 4000) errors.description = "Keep the description within 4,000 characters.";
  if (input.venue.length > 240) errors.venue = "Keep the venue within 240 characters.";
  if (!isEventTimeZone(input.timezone)) errors.timezone = "Choose a valid IANA timezone, such as Asia/Manila.";
  const startsAt = parseEventDateTimeInput(input.startsAt, input.timezone);
  const endsAt = parseEventDateTimeInput(input.endsAt, input.timezone);
  if (!startsAt) errors.startsAt = "Choose a valid, unambiguous start time in the event timezone.";
  if (!endsAt) errors.endsAt = "Choose a valid, unambiguous end time in the event timezone.";
  if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = "The end must be after the start.";
  return { errors, slug, startsAt, endsAt };
}
