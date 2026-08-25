import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";

function toUtcBasic(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function googleCalendarUrl(session: SessionWithSpeakers): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${toUtcBasic(session.start_time)}/${toUtcBasic(session.end_time)}`,
  });

  if (session.description) params.set("details", session.description);
  if (session.room) params.set("location", session.room);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(session: SessionWithSpeakers): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sync//Student Edition//EN",
    "BEGIN:VEVENT",
    `UID:${session.id}@sync.app`,
    `DTSTAMP:${toUtcBasic(new Date().toISOString())}`,
    `DTSTART:${toUtcBasic(session.start_time)}`,
    `DTEND:${toUtcBasic(session.end_time)}`,
    `SUMMARY:${escapeIcsText(session.title)}`,
  ];

  if (session.room) lines.push(`LOCATION:${escapeIcsText(session.room)}`);
  if (session.description) lines.push(`DESCRIPTION:${escapeIcsText(session.description)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(session: SessionWithSpeakers): void {
  const blob = new Blob([buildIcs(session)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${session.title.replace(/[^\w\-]+/g, "-").toLowerCase()}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
