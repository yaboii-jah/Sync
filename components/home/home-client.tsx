"use client";

import { useState, useTransition } from "react";
import { Card, Chip, Separator, Tabs, Typography } from "@/components/ui";
import type { Key } from "react-aria-components/Tabs";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  getBookmarkedSessionIds,
  getClaimedSessionIds,
  getEvent,
  getPublishedSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { formatManilaDate, formatManilaTime } from "@/lib/format";
import {
  claimSeat,
  releaseSeat,
  toggleBookmark,
  type ToggleBookmarkResult,
} from "@/app/(app)/home/actions";
import { useProgramFlowRealtime } from "@/hooks/use-program-flow-realtime";
import { useNow } from "@/hooks/use-now";
import { useToast } from "@/components/toast/toast-provider";
import { effectiveSessionStatus } from "@/lib/format";
import { seatClaimNotice } from "@/lib/seats";
import { EmptyState } from "@/components/empty-states";
import { HeroCard } from "./hero-card";
import { SessionCard } from "./session-card";
import { SessionModal } from "@/components/sessions/session-modal";
import { ScrollToNow } from "./scroll-to-now";
import { LiveMiniBar } from "./live-mini-bar";
import { InstallChip } from "@/components/push/install-chip";
import { VenueMap } from "./venue-map";
import {
  getConflictingSessionIds,
  getLiveSessions,
  groupSessionsByStartTime,
} from "@/lib/program-flow";

type View = "all" | "flow";

interface HomeClientProps {
  initialEvent: EventInfo;
  initialSessions: SessionWithSpeakers[];
  initialBookmarks: string[];
  /** Sessions this attendee already holds a seat in. */
  initialClaims: string[];
  /** Server-captured clock value used for the first hydrated render. */
  initialNow: number;
}

export function HomeClient({
  initialEvent,
  initialSessions,
  initialBookmarks,
  initialClaims,
  initialNow,
}: HomeClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [sessions, setSessions] = useState(initialSessions);
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const [claims, setClaims] = useState<Set<string>>(
    () => new Set(initialClaims),
  );
  /** The session whose seat is mid-flight, so a double tap cannot double-claim. */
  const [seatPendingId, setSeatPendingId] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const now = useNow(initialNow, 1000);
  const { toast } = useToast();
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  const liveSessions = getLiveSessions(sessions, now);
  const conflictIds = getConflictingSessionIds(sessions, bookmarks, now);

  async function refetchProgramFlow() {
    const client = createClient();
    const [nextEvent, nextSessions, nextBookmarks, nextClaims] =
      await Promise.all([
        getEvent(client),
        getPublishedSessionsWithSpeakers(client),
        getBookmarkedSessionIds(client),
        getClaimedSessionIds(client),
      ]);

    if (nextEvent) setEvent(nextEvent);
    setSessions(nextSessions);
    setBookmarks(new Set(nextBookmarks));
    setClaims(new Set(nextClaims));
  }

  useProgramFlowRealtime(() => {
    void startTransition(() => {
      void refetchProgramFlow();
    });
  });

  function handleToggleBookmark(sessionId: string) {
    const wasBookmarked = bookmarks.has(sessionId);

    setBookmarks((previous) => {
      const next = new Set(previous);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });

    startTransition(async () => {
      const result: ToggleBookmarkResult = await toggleBookmark(sessionId);
      if (result.error) {
        toast("Could not update your flow", "error");
        setBookmarks((previous) => {
          const reverted = new Set(previous);
          if (wasBookmarked) reverted.add(sessionId);
          else reverted.delete(sessionId);
          return reverted;
        });
      } else {
        const isBookmarked = result.bookmarked ?? !wasBookmarked;
        setBookmarks((previous) => {
          const next = new Set(previous);
          if (isBookmarked) next.add(sessionId);
          else next.delete(sessionId);
          return next;
        });

        if (isBookmarked && (result.conflicts?.length ?? 0) > 0) {
          const count = result.conflicts?.length ?? 0;
          toast(
            `Added to My Flow. Overlaps with ${count} saved ${count === 1 ? "session" : "sessions"}.`,
            "warning",
          );
        } else {
          toast(isBookmarked ? "Added to My Flow" : "Removed from My Flow");
        }
      }
    });
  }

  /*
   * Seats are shared state: a count can move because someone else took the
   * last one, so there is nothing safe to update optimistically here. Both
   * handlers let the server decide and then re-read the counts, which is also
   * what makes the loser of a race see the truth immediately.
   */
  function changeSeat(sessionId: string, action: "claim" | "release") {
    if (seatPendingId) return;
    setSeatPendingId(sessionId);

    startTransition(async () => {
      const result =
        action === "claim"
          ? await claimSeat(sessionId)
          : await releaseSeat(sessionId);

      if (result.error) {
        toast(result.error, "error");
      } else if (action === "claim") {
        // The RPC saves the session to My Flow in the same transaction.
        setClaims((previous) => new Set(previous).add(sessionId));
        setBookmarks((previous) => new Set(previous).add(sessionId));
        const notice = seatClaimNotice(result.conflicts?.length ?? 0);
        toast(notice.message, notice.tone);
      } else {
        setClaims((previous) => {
          const next = new Set(previous);
          next.delete(sessionId);
          return next;
        });
        // The bookmark deliberately stays: only the seat was given up.
        toast("Seat released");
      }

      await refetchProgramFlow();
      setSeatPendingId(null);
    });
  }

  const allSessions = sessions;
  const flowSessions = sessions.filter(
    (session) =>
      bookmarks.has(session.id) &&
      effectiveSessionStatus(session, now) !== "finished",
  );

  function renderList(items: SessionWithSpeakers[], emptyForFlow: boolean) {
    if (items.length === 0) {
      return (
        <Card variant="transparent" className="border-border border border-dashed">
          <EmptyState
            icon={<CalendarClock />}
            title={emptyForFlow ? "Nothing in your flow yet" : "No sessions yet"}
            description={
              emptyForFlow
                ? "Switch to All and bookmark the sessions you do not want to miss."
                : "The program will appear here once it is published."
            }
          />
        </Card>
      );
    }

    const groups = groupSessionsByStartTime(items);

    return (
      <ol className="flex flex-col gap-6">
        {groups.map((group, index) => {
          const live = group.sessions.some(
            (session) => effectiveSessionStatus(session, now) === "ongoing",
          );
          // D-1: the first group always states its date, and every later group
          // states it again when the Manila calendar day changes, so two groups
          // that read the same wall-clock time are told apart in the list.
          const showDate =
            index === 0 || group.dateKey !== groups[index - 1].dateKey;

          return (
            <li key={group.key}>
              {showDate ? (
                <Typography
                  type="body-sm"
                  color="muted"
                  className="pb-1 font-semibold"
                >
                  {formatManilaDate(group.startTime)}
                </Typography>
              ) : null}
              <div className="flex items-center justify-between gap-3 pb-2">
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    live ? "text-success" : "text-foreground"
                  }`}
                >
                  {formatManilaTime(group.startTime)}
                </span>
                <div className="flex items-center gap-2">
                  {group.sessions.length > 1 ? (
                    <Chip size="sm" variant="tertiary">
                      Parallel
                    </Chip>
                  ) : null}
                  {live ? (
                    <span className="text-success flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em]">
                      <span aria-hidden className="relative flex size-1.5">
                        <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
                        <span className="bg-success relative inline-flex size-1.5 rounded-full" />
                      </span>
                      LIVE
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {group.sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    bookmarked={bookmarks.has(session.id)}
                    conflict={view === "flow" && conflictIds.has(session.id)}
                    now={now}
                    onToggleBookmark={handleToggleBookmark}
                    onOpen={(target) => setActiveSessionId(target.id)}
                  />
                ))}
              </div>
              {groups.length > 1 && group.key !== groups[groups.length - 1].key ? (
                <Separator className="mt-6" />
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <>
      {liveSessions[0] ? (
        <LiveMiniBar
          targetId={`session-${liveSessions[0].id}`}
          title={
            liveSessions.length === 1
              ? liveSessions[0].title
              : `${liveSessions.length} sessions live`
          }
        />
      ) : null}

      <div className="lg:flex lg:items-start lg:gap-12">
        <div className="lg:sticky lg:top-10 lg:w-[38%] lg:max-w-sm lg:self-start">
          <HeroCard
            event={event}
            sessions={sessions}
            now={now}
            onOpenSession={(target) => setActiveSessionId(target.id)}
          />
          <VenueMap venue={event.venue} />
        </div>

        <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-accent size-5" aria-hidden />
            <Typography.Heading
              level={2}
              className="text-[22px] font-bold tracking-tight"
            >
              Program flow
            </Typography.Heading>
          </div>
          <Typography type="body-sm" color="muted" className="mt-1">
            {formatManilaDate(event.starts_at)}
          </Typography>
          <Tabs
            className="mt-4"
            selectedKey={view}
             onSelectionChange={(key: Key) => setView(key as View)}
          >
            <Tabs.List
              aria-label="Session filter"
              className="w-full gap-1 rounded-2xl bg-surface-secondary p-1.5 shadow-sm"
            >
              <Tabs.Tab
                id="all"
                className="min-w-0 basis-0 flex-1 font-medium data-[selected]:bg-accent data-[selected]:text-accent-foreground"
              >
                All
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab
                id="flow"
                className="min-w-0 basis-0 flex-1 font-medium data-[selected]:bg-accent data-[selected]:text-accent-foreground"
              >
                My Flow
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>

             <Tabs.Panel {...{ id: "all" }} className="mt-4">
              {renderList(allSessions, false)}
            </Tabs.Panel>
             <Tabs.Panel {...{ id: "flow" }} className="mt-4">
              {renderList(flowSessions, true)}
            </Tabs.Panel>
          </Tabs>
        </section>
      </div>

      <InstallChip />

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          seatHeld={claims.has(activeSession.id)}
          seatPending={seatPendingId === activeSession.id}
          onToggleBookmark={handleToggleBookmark}
          onClaimSeat={(sessionId) => changeSeat(sessionId, "claim")}
          onReleaseSeat={(sessionId) => changeSeat(sessionId, "release")}
          onClose={() => setActiveSessionId(null)}
        />
      ) : null}

      <ScrollToNow
        targetId={liveSessions[0] ? `session-${liveSessions[0].id}` : null}
      />
    </>
  );
}
