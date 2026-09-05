"use client";

import { useEffect, useState } from "react";
import { Card, Chip, Typography } from "@heroui/react";
import { BellOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/supabase/queries/notifications";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { getPublishedSessionById } from "@/lib/supabase/queries/program-flow";
import { formatRelativeTime } from "@/lib/format";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { useToast } from "@/components/toast/toast-provider";
import { useAlertsCount } from "@/components/alerts-count-provider";
import { SessionModal } from "@/components/sessions/session-modal";
import { EmptyState } from "@/components/empty-states";
import {
  toggleBookmark,
  type ToggleBookmarkResult,
} from "@/app/(app)/home/actions";

interface AlertsClientProps {
  initialNotifications: NotificationRow[];
  initialBookmarkedIds: string[];
}

/**
 * Alert kind is monochrome: emphasis runs from a solid chip (live, most
 * urgent) down to a soft chip (wrapped, archival).
 */
const TYPE_CHIPS: Record<
  string,
  { label: string; variant: "primary" | "secondary" | "tertiary" | "soft" }
> = {
  session_live: { label: "Live", variant: "primary" },
  session_reminder: { label: "Soon", variant: "secondary" },
  announcement: { label: "Announcement", variant: "tertiary" },
};

function TypeChip({ type }: { type: string }) {
  const chip = TYPE_CHIPS[type] ?? { label: "Wrapped", variant: "soft" as const };
  return (
    <Chip size="sm" variant={chip.variant}>
      {chip.label}
    </Chip>
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
  const [unavailableSessionIds, setUnavailableSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
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
    try {
      const session = await getPublishedSessionById(client, sessionId);
      if (session) {
        setActiveSession(session);
        return;
      }

      setUnavailableSessionIds((previous) => {
        const next = new Set(previous);
        next.add(sessionId);
        return next;
      });
      toast("Session details are unavailable.");
    } catch {
      toast("Could not load session details.", "error");
    }
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
    })();
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-3">
        {notifications.map((notification) => {
          const sessionUnavailable =
            notification.related_session_id !== null &&
            unavailableSessionIds.has(notification.related_session_id);
          const tappable =
            notification.related_session_id !== null && !sessionUnavailable;

          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <TypeChip type={notification.type} />
                <Typography type="body-xs" color="muted">
                  <time dateTime={notification.created_at}>
                    {formatRelativeTime(notification.created_at)}
                  </time>
                </Typography>
              </div>

              <Typography type="body" weight="semibold" className="mt-2">
                {notification.title}
              </Typography>

              {notification.body ? (
                <Typography type="body-sm" color="muted" className="mt-1">
                  {notification.body}
                </Typography>
              ) : null}

              {tappable ? (
                <Typography type="body-xs" weight="medium" className="mt-3">
                  View session
                </Typography>
              ) : sessionUnavailable ? (
                <Typography type="body-xs" color="muted" className="mt-3">
                  Session details unavailable
                </Typography>
              ) : null}
            </>
          );

          return (
            <Card key={notification.id}>
              {tappable ? (
                <button
                  type="button"
                  onClick={() =>
                    void openLinkedSession(notification.related_session_id!)
                  }
                  aria-haspopup="dialog"
                  className="w-full px-5 py-4 text-left"
                >
                  {body}
                </button>
              ) : (
                <div className="px-5 py-4">{body}</div>
              )}
            </Card>
          );
        })}

        {notifications.length === 0 ? (
          <Card variant="transparent" className="border-border border border-dashed">
            <EmptyState
              icon={<BellOff />}
              title="No alerts yet"
              description="Session updates and announcements appear here during the event."
            />
          </Card>
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
