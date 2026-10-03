import type { Database } from "../supabase/database.types";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
type PersonInsert = Database["public"]["Tables"]["speakers_sponsors"]["Insert"];
type SpeakerLinkInsert = Database["public"]["Tables"]["session_speakers"]["Insert"];

export const SOUTH_SUMMITY_NAME = "AWS Student Community Day South Summity 2026";
export const SOUTH_SUMMITY_DATE = "2026-10-07";
export const SOUTH_SUMMITY_VENUE = "Biñan People’s Center Auditorium";
export const SOUTH_SUMMITY_EVENT_ID = "20261007-0000-4000-8000-000000000001";

export interface ProgramEntry {
  key: string;
  title: string;
  start: string;
  end: string;
}

/** Transcribed from the two program-flow screenshots supplied by the owner. */
export const SOUTH_SUMMITY_PROGRAM: readonly ProgramEntry[] = [
  { key: "registration", title: "Registration", start: "09:30", end: "10:00" },
  { key: "opening", title: "Opening Ceremony and Emcee Introduction", start: "10:00", end: "10:15" },
  { key: "opening-keynote", title: "Opening Keynote: Cloud × AI: Building the Future Together", start: "10:15", end: "10:37" },
  { key: "icebreaker", title: "Icebreaker", start: "10:37", end: "10:47" },
  { key: "talk-1", title: "Talk #1: Built by Community: From Student Builder to Tech Professional", start: "10:47", end: "11:44" },
  { key: "lunch", title: "Lunch, Networking, and Community Hub", start: "11:44", end: "13:14" },
  { key: "afternoon-energizer", title: "Afternoon Energizer, Photo Hunt Winners, and Booth Challenge Updates", start: "13:14", end: "13:36" },
  { key: "sponsor-spotlight", title: "Sponsor Spotlight: Tutorials Dojo", start: "13:36", end: "13:46" },
  { key: "talk-2", title: "Talk #2: Building Smarter Systems with AI and Cloud — Women in Tech Keynote", start: "13:46", end: "14:43" },
  { key: "talk-3", title: "Talk #3: Human in the Loop: Preparing People for an AI-Driven Future", start: "14:43", end: "15:40" },
  { key: "panel", title: "Panel Discussion: Build. Grow. Lead: How Community Shapes Careers in Tech", start: "15:40", end: "16:40" },
  { key: "grand-raffle", title: "Grand Raffle", start: "16:40", end: "16:46" },
  { key: "appreciation", title: "Sponsor and Community Partner Appreciation", start: "16:46", end: "16:50" },
  { key: "closing", title: "Closing Remarks", start: "16:50", end: "16:55" },
  { key: "egress", title: "Egress and Group Photo", start: "16:55", end: "17:30" },
];

export function southSummityInstant(time: string): string {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error(`Invalid Philippine time: ${time}`);
  }
  return new Date(`${SOUTH_SUMMITY_DATE}T${time}:00+08:00`).toISOString();
}

/** Reject accidental gaps, overlap, or partial transcription of this single program. */
export function validateSouthSummityProgram(entries: readonly ProgramEntry[]): void {
  if (entries.length !== 15) throw new Error("Expected all 15 supplied program entries");
  const keys = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    if (!entry.key.trim() || keys.has(entry.key)) throw new Error("Program keys must be unique and nonempty");
    keys.add(entry.key);
    if (!entry.title.trim()) throw new Error("Program titles must be nonempty");
    const start = southSummityInstant(entry.start);
    const end = southSummityInstant(entry.end);
    if (end <= start) throw new Error(`Invalid interval: ${entry.key}`);
    if (index > 0 && entries[index - 1].end !== entry.start) {
      throw new Error(`Program must be continuous: ${entry.key}`);
    }
  }
  if (entries[0].start !== "09:30" || entries[entries.length - 1].end !== "17:30") {
    throw new Error("Program must cover 09:30–17:30 PHT");
  }
}

/** Data preparation only. No Supabase client, credentials, or mutation capability. */
export function prepareSouthSummityImport(theme = SOUTH_SUMMITY_NAME) {
  if (!theme.trim()) throw new Error("The legacy event theme must be nonempty");
  validateSouthSummityProgram(SOUTH_SUMMITY_PROGRAM);

  const event: EventInsert = {
    id: SOUTH_SUMMITY_EVENT_ID,
    name: SOUTH_SUMMITY_NAME,
    theme: theme.trim(),
    venue: SOUTH_SUMMITY_VENUE,
    starts_at: southSummityInstant("09:30"),
    ends_at: southSummityInstant("17:30"),
    status: "upcoming",
  };
  const sessions: SessionInsert[] = SOUTH_SUMMITY_PROGRAM.map((entry, index) => ({
    id: `20261007-0000-4000-8000-${String(index + 101).padStart(12, "0")}`,
    event_id: SOUTH_SUMMITY_EVENT_ID,
    title: entry.title,
    description: null,
    room: null,
    start_time: southSummityInstant(entry.start),
    end_time: southSummityInstant(entry.end),
    status: "not_started",
    published: true,
    capacity: null,
    reserved_seats: 0,
    claimed_seats: 0,
    seats_closed: false,
    status_override: null,
    status_override_at: null,
    status_override_by: null,
    actual_started_at: null,
    actual_ended_at: null,
    reminder_sent_at: null,
  }));

  const placeholders = [
    { key: "opening-keynote", label: "Opening keynote speaker", role: "speaker" },
    { key: "talk-1", label: "Talk #1 speaker", role: "speaker" },
    { key: "talk-2", label: "Talk #2 speaker", role: "speaker" },
    { key: "talk-3", label: "Talk #3 speaker", role: "speaker" },
    { key: "panel", label: "Panel lineup", role: "panelist" },
  ];
  const speakers: PersonInsert[] = placeholders.map((entry, index) => ({
    id: `20261007-0000-4000-8000-${String(index + 201).padStart(12, "0")}`,
    name: `${entry.label} — To be announced`,
    role: entry.role,
    photo_url: null,
    organization: null,
    bio: null,
    linkedin_url: null,
  }));
  const speakerLinks: SpeakerLinkInsert[] = placeholders.map((entry, index) => {
    const sessionIndex = SOUTH_SUMMITY_PROGRAM.findIndex((session) => session.key === entry.key);
    const sessionId = sessions[sessionIndex]?.id;
    const speakerId = speakers[index].id;
    if (!sessionId || !speakerId) throw new Error("Placeholder assignment references a missing row");
    return { session_id: sessionId, speaker_id: speakerId };
  });

  return {
    review: {
      state: "prepared-not-imported",
      timezone: "Asia/Manila",
      source: "Owner-supplied program screenshots, date, and venue",
      themeNeedsConfirmation: theme.trim() === SOUTH_SUMMITY_NAME,
      pending: [
        "Official event tagline or acceptance of the event name as the heading",
        "Replace approved placeholders with real speaker assets, biographies, and assignments when supplied",
        "Sponsor/partner directory content and quick links",
        "Administrator retention, registration rules, and launch feature choices",
        "Fresh live inventory, operator SQL review, rollback rehearsal, and import acceptance",
      ],
    },
    event,
    sessions,
    speakers,
    speakerLinks,
    sessionKeys: SOUTH_SUMMITY_PROGRAM.map((entry, index) => ({
      key: entry.key,
      session_id: sessions[index].id,
    })),
  };
}
