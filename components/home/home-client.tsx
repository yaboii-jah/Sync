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
import { formatManilaDate } from "@/lib/format";
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

interface HomeClientProps {
  initialEvent: EventInfo;
  initialSessions: SessionWithSpeakers[];
  initialBookmarks: string[];
}

export function HomeClient({
  initialEvent,
  initialSessions,
  initialBookmarks,
}: HomeClientProps) {
  const [event, setEvent] = useState(initialEvent);
  const [sessions, setSessions] = useState(initialSessions);
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const [view, setView] = useState<View>("all");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const now = useNow(1000);
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

    return (
      <div className="flex flex-col gap-3">
        {items.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            bookmarked={bookmarks.has(session.id)}
            now={now}
            onToggleBookmark={handleToggleBookmark}
            onOpen={(target) => setActiveSessionId(target.id)}
          />
        ))}
      </div>
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
          <HeroCard event={event} sessions={sessions} now={now} />
          <Typography type="body-sm" color="muted" className="mt-4 hidden lg:block">
            {formatManilaDate(event.starts_at)}
            {", "}
            {event.venue}
          </Typography>
        </div>

        <section className="mt-8 lg:mt-0 lg:min-w-0 lg:flex-1">
          <Typography.Heading level={2} className="text-base">
            Program flow
          </Typography.Heading>
          <Typography type="body-sm" color="muted" className="mt-1">
            {formatManilaDate(event.starts_at)}
          </Typography>

          <Tabs
            className="mt-4"
            selectedKey={view}
            onSelectionChange={(key) => setView(key as View)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Session filter">
                <Tabs.Tab id="all">
                  All
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="flow">
                  <Tabs.Separator />
                  My Flow
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

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
