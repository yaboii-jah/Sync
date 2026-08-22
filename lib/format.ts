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
