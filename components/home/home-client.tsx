"use client";

import { useState, useTransition } from "react";
import { Card, Tabs, Typography } from "@heroui/react";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  EventInfo,
  SessionWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import {
  getBookmarkedSessionIds,
  getEvent,
  getSessionsWithSpeakers,
} from "@/lib/supabase/queries/program-flow";
import { formatManilaDate, formatManilaTime } from "@/lib/format";
import {
  toggleBookmark,
  type ToggleBookmarkResult,
} from "@/app/(app)/home/actions";
import { useProgramFlowRealtime } from "@/hooks/use-program-flow-realtime";
import { useNow } from "@/hooks/use-now";
import { useToast } from "@/components/toast/toast-provider";
import { effectiveSessionStatus } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";
import { HeroCard } from "./hero-card";
import { SessionCard } from "./session-card";
import { SessionModal } from "@/components/sessions/session-modal";
import { ScrollToNow } from "./scroll-to-now";
import { LiveMiniBar } from "./live-mini-bar";

type View = "all" | "flow";

/** Where the day currently sits on the rail. */
function NowMarker() {
  return (
    <div aria-hidden className="flex items-center gap-2.5 pb-3">
      <span className="flex w-3 shrink-0 justify-center">
        <span className="bg-accent size-2.5 rounded-full ring-4 ring-(--accent)/25" />
      </span>
      <span className="text-accent text-[10px] font-bold tracking-[0.12em]">
        NOW
      </span>
      <span className="bg-accent/25 h-px flex-1" />
    </div>
  );
}

interface HomeClientProps {
  initialEvent: EventInfo;
  initialSessions: SessionWithSpeakers[];
  initialBookmarks: string[];
  /** Server-captured clock value used for the first hydrated render. */
  initialNow: number;
}

export function HomeClient({
  initialEvent,
  initialSessions,
  initialBookmarks,
  initialNow,
}: HomeClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [sessions, setSessions] = useState(initialSessions);
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const [view, setView] = useState<View>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const now = useNow(initialNow, 1000);
  const { toast } = useToast();
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  const liveSession =
    sessions.find(
      (session) => effectiveSessionStatus(session, now) === "ongoing",
    ) ?? null;

  async function refetchProgramFlow() {
    const client = createClient();
    const [nextEvent, nextSessions, nextBookmarks] = await Promise.all([
      getEvent(client),
      getSessionsWithSpeakers(client),
      getBookmarkedSessionIds(client),
    ]);

    if (nextEvent) setEvent(nextEvent);
    setSessions(nextSessions);
    setBookmarks(new Set(nextBookmarks));
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
          if (reverted.has(sessionId)) {
            reverted.delete(sessionId);
          } else {
            reverted.add(sessionId);
          }
          return reverted;
        });
      } else {
        toast(wasBookmarked ? "Removed from My Flow" : "Added to My Flow");
      }
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

    /*
     * A slim progress rail beside the cells. The line itself is the timeline:
     * filled through everything already past, part-filled across the session
     * running right now, hollow for what is still to come — so the day's
     * progress is legible at a glance without reading a single time.
     *
     * Only 12px wide with no time column; that column cost ~90px of a 390px
     * screen and pushed titles to four lines, so the times live in the cells.
     */
    const nowIndex = items.findIndex(
      (session) => new Date(session.start_time).getTime() > now,
    );

    return (
      <ol className="flex flex-col">
        {items.map((session, index) => {
          const status = effectiveSessionStatus(session, now);
          const startedAt = new Date(session.start_time).getTime();
          const endsAt = new Date(session.end_time).getTime();

          /*
           * How much of this row's rail segment is behind us. Quantised to the
           * minute so the server and client renders agree.
           */
          const nowMinute = Math.floor(now / 60_000) * 60_000;
          const fillPct =
            status === "finished"
              ? 100
              : status === "ongoing"
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      ((nowMinute - startedAt) / (endsAt - startedAt)) * 100,
                    ),
                  )
                : 0;

          return (
            <li key={session.id}>
              {index === nowIndex ? <NowMarker /> : null}

              {/*
                * The start time reads as a header above its cell rather than in
                * a fixed left column. Same information, none of the ~90px that
                * column cost on a 390px screen, and the day still scans
                * top-to-bottom as a sequence of times.
                */}
              <div className="flex items-baseline justify-between gap-3 pb-1.5">
                <span
                  className={`text-[13px] font-semibold tabular-nums ${
                    status === "ongoing"
                      ? "text-accent"
                      : status === "finished"
                        ? "text-muted"
                        : "text-foreground"
                  }`}
                >
                  {formatManilaTime(session.start_time)}
                </span>
                {status === "ongoing" ? (
                  <span className="text-accent flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em]">
                    <span aria-hidden className="relative flex size-1.5">
                      <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
                      <span className="bg-accent relative inline-flex size-1.5 rounded-full" />
                    </span>
                    LIVE
                  </span>
                ) : null}
              </div>

              <div className="flex gap-2.5 pb-3">
                <div
                  aria-hidden
                  className="relative flex w-3 shrink-0 justify-center"
                >
                  <span
                    className="absolute inset-y-0 w-[3px] rounded-full"
                    style={{
                      background: `linear-gradient(to bottom, var(--accent) ${fillPct}%, var(--separator) ${fillPct}%)`,
                    }}
                    suppressHydrationWarning
                  />
                  <span
                    className={`relative mt-3.5 size-2.5 rounded-full ${
                      status === "ongoing"
                        ? "bg-accent ring-accent/25 ring-4"
                        : status === "finished"
                          ? "bg-accent"
                          : "bg-separator"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <SessionCard
                    session={session}
                    bookmarked={bookmarks.has(session.id)}
                    now={now}
                    onToggleBookmark={handleToggleBookmark}
                    onOpen={(target) => setActiveSessionId(target.id)}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <>
      {liveSession ? (
        <LiveMiniBar
          targetId={`session-${liveSession.id}`}
          title={liveSession.title}
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
          <Typography type="body-sm" color="muted" className="mt-4 hidden lg:block">
            {formatManilaDate(event.starts_at)}
            {", "}
            {event.venue}
          </Typography>
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
            onSelectionChange={(key) => setView(key as View)}
          >
            <Tabs.List
              aria-label="Session filter"
              className="w-full gap-0 rounded-[calc(var(--radius)*2.5)] bg-default p-1"
            >
              <Tabs.Tab id="all" className="min-w-0 basis-0 flex-1">
                All
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="flow" className="min-w-0 basis-0 flex-1">
                My Flow
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel id="all" className="mt-4">
              {renderList(allSessions, false)}
            </Tabs.Panel>
            <Tabs.Panel id="flow" className="mt-4">
              {renderList(flowSessions, true)}
            </Tabs.Panel>
          </Tabs>
        </section>
      </div>

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          onToggleBookmark={handleToggleBookmark}
          onClose={() => setActiveSessionId(null)}
        />
      ) : null}

      <ScrollToNow targetId={liveSession ? `session-${liveSession.id}` : null} />
    </>
  );
}
