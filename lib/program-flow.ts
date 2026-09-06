import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { effectiveSessionStatus } from "@/lib/format";

export interface SessionTimeGroup {
  key: string;
  startTime: string;
  sessions: SessionWithSpeakers[];
}

export interface BookmarkConflict {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  room: string | null;
}

function compareSessions(
  left: SessionWithSpeakers,
  right: SessionWithSpeakers,
): number {
  const startDifference =
    new Date(left.start_time).getTime() - new Date(right.start_time).getTime();
  if (startDifference !== 0) return startDifference;

  const endDifference =
    new Date(left.end_time).getTime() - new Date(right.end_time).getTime();
  if (endDifference !== 0) return endDifference;

  const titleDifference = left.title.localeCompare(right.title);
  if (titleDifference !== 0) return titleDifference;

  return left.id.localeCompare(right.id);
}

export function sortSessions(
  sessions: SessionWithSpeakers[],
): SessionWithSpeakers[] {
  return [...sessions].sort(compareSessions);
}

export function groupSessionsByStartTime(
  sessions: SessionWithSpeakers[],
): SessionTimeGroup[] {
  const groups = new Map<number, SessionTimeGroup>();

  for (const session of sortSessions(sessions)) {
    const start = new Date(session.start_time).getTime();
    const existing = groups.get(start);

    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    groups.set(start, {
      key: String(start),
      startTime: session.start_time,
      sessions: [session],
    });
  }

  return [...groups.values()];
}

export function getLiveSessions(
  sessions: SessionWithSpeakers[],
  now: number,
): SessionWithSpeakers[] {
  return sortSessions(
    sessions.filter(
      (session) => effectiveSessionStatus(session, now) === "ongoing",
    ),
  );
}

export function getNextSessions(
  sessions: SessionWithSpeakers[],
  now: number,
): SessionWithSpeakers[] {
  const upcoming = sortSessions(
    sessions.filter(
      (session) => effectiveSessionStatus(session, now) === "not_started",
    ),
  );
  const first = upcoming[0];

  if (!first) return [];

  const firstStart = new Date(first.start_time).getTime();
  return upcoming.filter(
    (session) => new Date(session.start_time).getTime() === firstStart,
  );
}

export function getConflictingSessionIds(
  sessions: SessionWithSpeakers[],
  bookmarkedIds: ReadonlySet<string>,
  now: number,
): Set<string> {
  const saved = sortSessions(
    sessions.filter(
      (session) =>
        bookmarkedIds.has(session.id) &&
        effectiveSessionStatus(session, now) !== "finished",
    ),
  );
  const conflicts = new Set<string>();

  for (let index = 0; index < saved.length; index += 1) {
    const left = saved[index];
    const leftStart = new Date(left.start_time).getTime();
    const leftEnd = new Date(left.end_time).getTime();

    for (let nextIndex = index + 1; nextIndex < saved.length; nextIndex += 1) {
      const right = saved[nextIndex];
      const rightStart = new Date(right.start_time).getTime();
      const rightEnd = new Date(right.end_time).getTime();

      if (leftStart < rightEnd && rightStart < leftEnd) {
        conflicts.add(left.id);
        conflicts.add(right.id);
      }
    }
  }

  return conflicts;
}
