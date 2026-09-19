import { parseEventDateTimeInput } from "./basics";

export const EVENT_SPEAKER_ROLES = [
  "speaker",
  "host",
  "panelist",
  "sponsor",
] as const;

export type EventSpeakerRole = (typeof EVENT_SPEAKER_ROLES)[number];

export interface ManagedSessionInput {
  title: string;
  description: string;
  room: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
}

export interface ManagedSpeakerInput {
  name: string;
  role: string;
  organization: string;
  bio: string;
  photoUrl: string;
  linkedinUrl: string;
  published: boolean;
}

export interface ProgramActionResult {
  error?: string;
  entityId?: string;
}

function validHttpsUrl(value: string, hostname?: string): boolean {
  if (!value.trim()) return true;
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (!hostname || url.hostname === hostname || url.hostname.endsWith(`.${hostname}`));
  } catch {
    return false;
  }
}

export function validateManagedSession(
  input: ManagedSessionInput,
  timezone: string,
  eventStartsAt: string,
  eventEndsAt: string,
): { error?: string; startsAt?: string; endsAt?: string } {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) return { error: "Use a session title between 1 and 120 characters." };
  if (input.description.length > 2000) return { error: "Keep the session description within 2,000 characters." };
  if (input.room.length > 120) return { error: "Keep the room label within 120 characters." };

  const startsAt = parseEventDateTimeInput(input.startsAt, timezone);
  const endsAt = parseEventDateTimeInput(input.endsAt, timezone);
  if (!startsAt || !endsAt) return { error: `Choose valid, unambiguous times in ${timezone}.` };
  const startTime = Date.parse(startsAt);
  const endTime = Date.parse(endsAt);
  const eventStartTime = Date.parse(eventStartsAt);
  const eventEndTime = Date.parse(eventEndsAt);
  if (![startTime, endTime, eventStartTime, eventEndTime].every(Number.isFinite)) return { error: "The event date range is invalid. Reload before editing its schedule." };
  if (endTime <= startTime) return { error: "The session end must be after its start." };
  if (startTime < eventStartTime || endTime > eventEndTime) return { error: "The session must stay within the event dates." };
  return { startsAt, endsAt };
}

export function validateManagedSpeaker(
  input: ManagedSpeakerInput,
): { error?: string; role?: EventSpeakerRole } {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 200) return { error: "Use a name between 1 and 200 characters." };
  if (!(EVENT_SPEAKER_ROLES as readonly string[]).includes(input.role)) return { error: "Choose a valid speaker role." };
  if (input.organization.length > 240) return { error: "Keep the organization within 240 characters." };
  if (input.bio.length > 4000) return { error: "Keep the biography within 4,000 characters." };
  if (!validHttpsUrl(input.photoUrl)) return { error: "Use an HTTPS portrait URL, or leave it blank." };
  if (!validHttpsUrl(input.linkedinUrl, "linkedin.com")) return { error: "Use an HTTPS LinkedIn URL, or leave it blank." };
  return { role: input.role as EventSpeakerRole };
}

export function validateSpeakerIds(ids: string[]): string | null {
  if (ids.length > 50) return "A session can have at most 50 speakers.";
  if (new Set(ids).size !== ids.length) return "The speaker selection contains duplicates.";
  if (ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    return "The speaker selection is invalid.";
  }
  return null;
}
