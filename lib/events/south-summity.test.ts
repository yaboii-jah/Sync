import { describe, expect, it } from "vitest";
import { formatManilaDateTimeInput } from "../format";
import {
  prepareSouthSummityImport,
  SOUTH_SUMMITY_EVENT_ID,
  SOUTH_SUMMITY_NAME,
  SOUTH_SUMMITY_PROGRAM,
  southSummityInstant,
  validateSouthSummityProgram,
} from "./south-summity";

describe("South Summity content preparation", () => {
  it("represents October 7 in PHT regardless of the machine timezone", () => {
    const payload = prepareSouthSummityImport();
    expect(payload.event.starts_at).toBe("2026-10-07T01:30:00.000Z");
    expect(payload.event.ends_at).toBe("2026-10-07T09:30:00.000Z");
    expect(formatManilaDateTimeInput(payload.event.starts_at)).toBe("2026-10-07T09:30");
    expect(formatManilaDateTimeInput(payload.event.ends_at)).toBe("2026-10-07T17:30");
    expect(payload.event.venue).toBe("Biñan People’s Center Auditorium");
  });

  it("keeps every supplied slot, including the 90-minute lunch and short closing activities", () => {
    const payload = prepareSouthSummityImport();
    expect(payload.sessions).toHaveLength(15);
    expect(payload.sessions.map((row) => [
      formatManilaDateTimeInput(row.start_time).slice(11),
      formatManilaDateTimeInput(row.end_time).slice(11),
    ])).toEqual([
      ["09:30", "10:00"], ["10:00", "10:15"], ["10:15", "10:37"],
      ["10:37", "10:47"], ["10:47", "11:44"], ["11:44", "13:14"],
      ["13:14", "13:36"], ["13:36", "13:46"], ["13:46", "14:43"],
      ["14:43", "15:40"], ["15:40", "16:40"], ["16:40", "16:46"],
      ["16:46", "16:50"], ["16:50", "16:55"], ["16:55", "17:30"],
    ]);
  });

  it("uses stable distinct IDs with event linkage and no reused historical namespace", () => {
    const first = prepareSouthSummityImport();
    expect(prepareSouthSummityImport()).toEqual(first);
    const ids = [first.event.id, ...first.sessions.map((row) => row.id), ...first.speakers.map((row) => row.id)];
    expect(new Set(ids).size).toBe(21);
    for (const id of ids) expect(id).toMatch(/^20261007-0000-4000-8000-\d{12}$/);
    for (const row of first.sessions) expect(row.event_id).toBe(SOUTH_SUMMITY_EVENT_ID);
    expect(first.sessionKeys.find((entry) => entry.key === "panel")?.session_id).toBe(first.sessions[10].id);
  });

  it("does not invent room, description, seat or operational data", () => {
    const payload = prepareSouthSummityImport();
    for (const row of payload.sessions) {
      expect(row).toMatchObject({
        room: null, description: null, capacity: null, reserved_seats: 0,
        claimed_seats: 0, seats_closed: false, published: true,
        status_override: null, status_override_by: null, actual_started_at: null,
        actual_ended_at: null, reminder_sent_at: null,
      });
    }
    expect(payload.review.state).toBe("prepared-not-imported");
    expect(payload).not.toHaveProperty("admins");
    expect(payload).not.toHaveProperty("notifications");
  });

  it("links five unconfirmed placeholders only to the intended speaking slots", () => {
    const payload = prepareSouthSummityImport();
    expect(payload.speakers).toHaveLength(5);
    expect(payload.speakerLinks).toHaveLength(5);
    expect(payload.speakers.map((person) => person.role)).toEqual(["speaker", "speaker", "speaker", "speaker", "panelist"]);
    for (const person of payload.speakers) {
      expect(person.name).toContain("To be announced");
      expect(person).toMatchObject({ photo_url: null, bio: null, organization: null, linkedin_url: null });
    }
    expect(payload.speakerLinks.map((link) => payload.sessions.find((session) => session.id === link.session_id)?.title)).toEqual([
      payload.sessions[2].title, payload.sessions[4].title, payload.sessions[8].title,
      payload.sessions[9].title, payload.sessions[10].title,
    ]);
    expect(payload.speakerLinks.map((link) => link.speaker_id)).toEqual(payload.speakers.map((person) => person.id));
  });

  it("marks the provisional theme for review and rejects a blank constrained theme", () => {
    expect(prepareSouthSummityImport().event.theme).toBe(SOUTH_SUMMITY_NAME);
    expect(prepareSouthSummityImport().review.themeNeedsConfirmation).toBe(true);
    expect(prepareSouthSummityImport(" Approved tagline ").event.theme).toBe("Approved tagline");
    expect(prepareSouthSummityImport("Approved tagline").review.themeNeedsConfirmation).toBe(false);
    expect(() => prepareSouthSummityImport(" ")).toThrow("theme must be nonempty");
  });

  it.each(["9:30", "24:00", "12:60", "09:30Z", "", "-1:00"])("rejects malformed wall-clock time %s", (time) => {
    expect(() => southSummityInstant(time)).toThrow("Invalid Philippine time");
  });

  it("rejects a partial program", () => {
    expect(() => validateSouthSummityProgram(SOUTH_SUMMITY_PROGRAM.slice(1))).toThrow("15 supplied");
  });

  it.each(["10:16", "10:14"])("rejects a gap or overlap at %s", (start) => {
    const rows = SOUTH_SUMMITY_PROGRAM.map((row) => ({ ...row }));
    rows[2].start = start;
    expect(() => validateSouthSummityProgram(rows)).toThrow("continuous");
  });

  it("rejects zero duration, duplicate keys, missing titles, and shifted day bounds", () => {
    const edits = [
      (rows: { key: string; title: string; start: string; end: string }[]) => { rows[0].end = "09:30"; },
      (rows: { key: string; title: string; start: string; end: string }[]) => { rows[1].key = rows[0].key; },
      (rows: { key: string; title: string; start: string; end: string }[]) => { rows[0].title = " "; },
      (rows: { key: string; title: string; start: string; end: string }[]) => { rows[0].start = "09:00"; },
    ];
    for (const edit of edits) {
      const rows = SOUTH_SUMMITY_PROGRAM.map((row) => ({ ...row }));
      edit(rows);
      expect(() => validateSouthSummityProgram(rows)).toThrow();
    }
  });
});
