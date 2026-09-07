"use client";

import { useEffect, useState } from "react";
import { Card, Separator, Typography } from "@/components/ui";
import {
  BellOff,
  CheckCircle2,
  Clock3,
  Megaphone,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/supabase/queries/notifications";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import type { SessionWithSpeakers } from "@/lib/supabase/queries/program-flow";
import {
  getClaimedSessionIds,
  getPublishedSessionById,
} from "@/lib/supabase/queries/program-flow";
import { formatRelativeTime } from "@/lib/format";
import { seatClaimNotice } from "@/lib/seats";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { useToast } from "@/components/toast/toast-provider";
import { useAlertsCount } from "@/components/alerts-count-provider";
import { SessionModal } from "@/components/sessions/session-modal";
import { EmptyState } from "@/components/empty-states";
import {
  claimSeat,
  releaseSeat,
  toggleBookmark,
  type ToggleBookmarkResult,
} from "@/app/(app)/home/actions";

interface AlertsClientProps {
  initialNotifications: NotificationRow[];
  initialBookmarkedIds: string[];
}

const TYPE_META: Record<
  string,
  {
    label: string;
    icon: LucideIcon;
    iconClass: string;
  }
> = {
  session_live: { label: "Live now", icon: Radio, iconClass: "bg-success/15 text-success" },
  session_reminder: { label: "Starting soon", icon: Clock3, iconClass: "bg-warning/15 text-warning" },
  announcement: { label: "Announcement", icon: Megaphone, iconClass: "bg-accent/15 text-accent" },
  session_ended: { label: "Session ended", icon: CheckCircle2, iconClass: "bg-default text-muted" },
};

function typeMeta(type: string) {
  return TYPE_META[type] ?? {
    label: "Event update",
    icon: Radio,
    iconClass: "bg-default text-muted",
  };
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
  /*
   * Seats are only ever needed once a linked session is actually opened, so
   * they are read then rather than on every visit to the feed.
   */
  const [claims, setClaims] = useState<Set<string>>(() => new Set());
  const [seatPendingId, setSeatPendingId] = useState<string | null>(null);
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

  /**
   * Read a session and this attendee's seats together, and adopt them as the
   * open session. Returns null when the session is not attendee-visible, which
   * is how `openLinkedSession` tells a missing session from a loaded one.
   */
  async function loadSessionWithSeats(sessionId: string) {
    const client = createClient();
    const [session, claimedIds] = await Promise.all([
      getPublishedSessionById(client, sessionId),
      getClaimedSessionIds(client),
    ]);

    setClaims(new Set(claimedIds));
    if (session) setActiveSession(session);
    return session;
  }

  async function openLinkedSession(sessionId: string) {
    try {
      if (await loadSessionWithSeats(sessionId)) return;

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

  /*
   * Same rule as Home: seats are shared, so nothing is updated optimistically
   * and the open session is re-read once the server has decided.
   */
  function changeSeat(sessionId: string, action: "claim" | "release") {
    if (seatPendingId) return;
    setSeatPendingId(sessionId);

    void (async () => {
      const result =
        action === "claim"
          ? await claimSeat(sessionId)
          : await releaseSeat(sessionId);

      if (result.error) {
        toast(result.error, "error");
      } else if (action === "claim") {
        // The RPC saves the session to My Flow in the same transaction.
        setBookmarks((previous) => new Set(previous).add(sessionId));
        const notice = seatClaimNotice(result.conflicts?.length ?? 0);
        toast(notice.message, notice.tone);
      } else {
        toast("Seat released");
      }

      await loadSessionWithSeats(sessionId);
      setSeatPendingId(null);
    })();
  }

  return (
    <>
      {notifications.length > 0 ? (
        <Card className="mt-6 overflow-hidden p-0">
          {notifications.map((notification, index) => {
          const sessionUnavailable =
            notification.related_session_id !== null &&
            unavailableSessionIds.has(notification.related_session_id);
          const tappable =
            notification.related_session_id !== null && !sessionUnavailable;
          const meta = typeMeta(notification.type);
          const Icon = meta.icon;

          const body = (
            <div className="flex min-w-0 gap-3.5">
              <span
                aria-hidden
                className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Typography type="body-xs" weight="semibold" className="text-foreground">
                    {meta.label}
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    <time dateTime={notification.created_at}>
                      {formatRelativeTime(notification.created_at)}
                    </time>
                  </Typography>
                </div>

                <Typography type="body" weight="semibold" className="mt-1 leading-snug">
                  {notification.title}
                </Typography>

                {notification.body ? (
                  <Typography type="body-sm" color="muted" className="mt-1.5 leading-5">
                    {notification.body}
                  </Typography>
                ) : null}

                {tappable ? (
                  <Typography type="body-xs" weight="medium" className="mt-2.5 text-accent">
                    Open session
                  </Typography>
                ) : sessionUnavailable ? (
                  <Typography type="body-xs" color="muted" className="mt-2.5">
                    Session details unavailable
                  </Typography>
                ) : null}
              </div>
            </div>
          );

          return (
            <div key={notification.id}>
              {index > 0 ? <Separator /> : null}
              {tappable ? (
                <button
                  type="button"
                  onClick={() =>
                    void openLinkedSession(notification.related_session_id!)
                  }
                  aria-haspopup="dialog"
                  className="hover:bg-default/70 w-full px-4 py-4 text-left transition-colors sm:px-5"
                >
                  {body}
                </button>
              ) : (
                <div className="px-4 py-4 sm:px-5">{body}</div>
              )}
            </div>
          );
          })}
        </Card>
      ) : (
        <Card variant="transparent" className="mt-6 border border-dashed border-border">
          <EmptyState
            icon={<BellOff />}
            title="No alerts yet"
            description="Session updates and announcements appear here during the event."
          />
        </Card>
      )}

      {activeSession ? (
        <SessionModal
          session={activeSession}
          bookmarked={bookmarks.has(activeSession.id)}
          seatHeld={claims.has(activeSession.id)}
          seatPending={seatPendingId === activeSession.id}
          onToggleBookmark={handleToggleBookmark}
          onClaimSeat={(sessionId) => changeSeat(sessionId, "claim")}
          onReleaseSeat={(sessionId) => changeSeat(sessionId, "release")}
          onClose={() => setActiveSession(null)}
        />
      ) : null}
    </>
  );
}
