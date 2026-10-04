import { afterEach, describe, expect, it, vi } from "vitest";
import {
  effectiveSessionStatus,
  relativeSessionLabel,
  scheduledSessionRemaining,
} from "./format";
import {
  getConflictingSessionIds,
  getLiveSessions,
  getNextSessions,
} from "./program-flow";
import type { SessionWithSpeakers } from "./supabase/queries/program-flow";

const start = "2026-10-07T02:00:00Z";
const end = "2026-10-07T03:00:00Z";
function session(id: string, status = "not_started"): SessionWithSpeakers {
  return {
    id, title: id, description: null, room: null, start_time: start,
    end_time: end, status, status_override: null, status_override_at: null,
    actual_started_at: null, actual_ended_at: null, published: true,
    speakers: [], capacity: null, reserved_seats: 0, claimed_seats: 0,
    seats_closed: false,
  };
}

afterEach(() => vi.useRealTimers());

describe("manual session state", () => {
  it.each([
    "2026-10-07T01:00:00Z", "2026-10-07T02:30:00Z", "2026-10-08T03:00:00Z",
  ])("uses stored state at %s, including without override metadata", (now) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    for (const status of ["not_started", "ongoing", "finished"]) {
      expect(effectiveSessionStatus(session(status, status))).toBe(status);
    }
  });

  it("does not invent a live state for an invalid stored status", () => {
    expect(effectiveSessionStatus(session("invalid", "unknown"))).toBe("not_started");
  });

  it("keeps late waiting sessions up next and concurrent manual sessions live", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T03:00:00Z"));
    const sessions = [session("ended", "finished"), session("waiting"),
      session("live-a", "ongoing"), session("live-b", "ongoing"),
      { ...session("later"), start_time: "2026-10-07T04:00:00Z", end_time: "2026-10-07T05:00:00Z" }];
    expect(getLiveSessions(sessions).map(s => s.id)).toEqual(["live-a", "live-b"]);
    expect(getNextSessions(sessions).map(s => s.id)).toEqual(["waiting"]);
  });

  it("retains late bookmark conflicts until a session is manually finished", () => {
    const sessions = [session("waiting"), session("live", "ongoing"), session("ended", "finished")];
    const bookmarks = new Set(sessions.map(s => s.id));
    expect([...getConflictingSessionIds(sessions, bookmarks)]).toEqual(["live", "waiting"]);
    sessions[1].status = "finished";
    expect([...getConflictingSessionIds(sessions, bookmarks)]).toEqual([]);
  });
});

describe("planned and actual time wording", () => {
  it("describes future waiting sessions as scheduled", () => {
    expect(relativeSessionLabel(start, "scheduled", Date.parse(start) - 120_000)).toBe("Scheduled in 2 min");
    expect(relativeSessionLabel(start, "scheduled", Date.parse(start) - 10_000)).toBe("Scheduled now");
  });

  it.each([0, 60_000, 86_400_000])("does not claim a waiting session started after %s ms", offset => {
    expect(relativeSessionLabel(start, "scheduled", Date.parse(start) + offset)).toBe("Awaiting admin start");
  });

  it("keeps actual start and end relative wording", () => {
    const now = Date.parse(start) + 120_000;
    expect(relativeSessionLabel(start, "start", now)).toBe("started 2 min ago");
    expect(relativeSessionLabel(start, "end", now)).toBe("ended 2 min ago");
  });

  it("labels countdowns as scheduled estimates and overruns as still in progress", () => {
    expect(scheduledSessionRemaining(end, Date.parse(end) - 90_000)).toBe("1:30 until scheduled end");
    expect(scheduledSessionRemaining(end, Date.parse(end) - 3_900_000)).toBe("1 hr 5 min until scheduled end");
    expect(scheduledSessionRemaining(end, Date.parse(end))).toBe("Past scheduled end");
    expect(scheduledSessionRemaining(end, Date.parse(end) + 86_400_000)).toBe("Past scheduled end");
  });
});
