"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/supabase/queries/notifications";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { getSessionById } from "@/lib/supabase/queries/program-flow";
import { formatRelativeTime } from "@/lib/format";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { useToast } from "@/components/toast/toast-provider";
import { useAlertsCount } from "@/components/alerts-count-provider";
import { SessionModal } from "@/components/sessions/session-modal";
import { EmptyCity } from "@/components/empty-states";
import { toggleBookmark, type ToggleBookmarkResult } from "@/app/(app)/home/actions";

interface AlertsClientProps {
  initialNotifications: NotificationRow[];
  initialBookmarkedIds: string[];
}

function TypeBadge({ type }: { type: string }) {
  if (type === "session_live") {
    return (
      <span className="inline-flex items-center rounded-full bg-state-success px-2.5 py-0.5 text-xs font-bold text-charcoal shadow-[0_0_12px_rgba(88,222,105,0.5)] animate-pulse">
        Live
      </span>
    );
  }
  if (type === "session_reminder") {
    return (
      <span className="inline-flex items-center rounded-full border border-pastel-yellow/60 px-2.5 py-0.5 text-xs font-bold text-pastel-yellow">
        Soon
      </span>
    );
  }
  if (type === "announcement") {
    return (
      <span className="inline-flex items-center rounded-full bg-pastel-yellow px-2.5 py-0.5 text-xs font-bold text-charcoal">
        Announcement
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs text-text-primary/45">
      Wrapped
    </span>
  );
}

export function AlertsClient({
  initialNotifications,
  initialBookmarkedIds,
}: AlertsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [bookmarks, setBookmarks] = useState<Set<string>>(
    () => new Set(initialBookmarkedIds),
  );
  const [activeSession, setActiveSession] =
    useState<SessionWithSpeakers | null>(null);
  const { toast } = useToast();
  const { markAllRead } = useAlertsCount();

  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refetchNotifications() {
    const client = createClient();
    setNotifications(await getNotifications(client));
  }

  useRealtimeRefetch(["notifications"], () => {
    void refetchNotifications();
  });

  async function openLinkedSession(sessionId: string) {
    const client = createClient();
    const session = await getSessionById(client, sessionId);
    if (session) setActiveSession(session);
  }

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

    void (async () => {
      const result: ToggleBookmarkResult = await toggleBookmark(sessionId);
      if (result.error) {
        toast("Couldn't update your flow", "error");
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
    })();
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-3">
        {notifications.map((notification) => {
          const tappable = notification.related_session_id !== null;

          const card = (
            <>
              <div className="flex items-center justify-between gap-2">
                <TypeBadge type={notification.type} />
                <time
                  dateTime={notification.created_at}
                  className="text-xs text-text-muted"
                >
                  {formatRelativeTime(notification.created_at)}
                </time>
              </div>
              <h3 className="mt-2 font-bold leading-snug text-text-primary">
                {notification.title}
              </h3>
              {notification.body ? (
                <p className="mt-1 text-sm leading-snug text-text-muted">
                  {notification.body}
                </p>
              ) : null}
              {tappable ? (
                <p className="mt-2 text-xs font-bold text-pastel-yellow/80">
                  View session →
                </p>
              ) : null}
            </>
          );

          return tappable ? (
            <button
              key={notification.id}
              type="button"
              onClick={() => void openLinkedSession(notification.related_session_id!)}
              aria-haspopup="dialog"
              className="w-full rounded-2xl border border-border-default bg-bg-base px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:bg-accent-primary/20"
            >
              {card}
            </button>
          ) : (
            <article
              key={notification.id}
              className="rounded-2xl border border-border-default bg-bg-base px-4 py-4"
            >
              {card}
            </article>
          );
        })}
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center">
            <EmptyCity />
            <p className="mt-3 text-sm text-text-muted">
              No alerts yet — they&apos;ll appear here during the event.
            </p>
          </div>
        ) : null}
      </div>

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          onToggleBookmark={handleToggleBookmark}
          onClose={() => setActiveSession(null)}
        />
      ) : null}
    </>
  );
}
