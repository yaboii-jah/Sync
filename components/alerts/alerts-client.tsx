"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/supabase/queries/notifications";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import { formatRelativeTime } from "@/lib/format";
import { useRealtimeRefetch } from "@/hooks/use-realtime-refetch";
import { EmptyCity } from "@/components/empty-states";

interface AlertsClientProps {
  initialNotifications: NotificationRow[];
}

function TypeBadge({ type }: { type: string }) {
  if (type === "session_live") {
    return (
      <span className="inline-flex items-center rounded-full bg-state-success px-2.5 py-0.5 text-xs font-bold text-charcoal shadow-[0_0_12px_rgba(88,222,105,0.5)] animate-pulse">
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs text-text-primary/45">
      Wrapped
    </span>
  );
}

export function AlertsClient({ initialNotifications }: AlertsClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);

  async function refetchNotifications() {
    const client = createClient();
    setNotifications(await getNotifications(client));
  }

  useRealtimeRefetch(["notifications"], () => {
    void refetchNotifications();
  });

  return (
    <div className="mt-4 flex flex-col gap-3">
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className="rounded-2xl border border-border-default bg-bg-base px-4 py-4"
        >
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
        </article>
      ))}
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-bg-base px-5 py-8 text-center">
          <EmptyCity />
          <p className="mt-3 text-sm text-text-muted">
            No alerts yet — they&apos;ll appear here during the event.
          </p>
        </div>
      ) : null}
    </div>
  );
}
