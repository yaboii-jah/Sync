"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getNotifications, type NotificationRow } from "@/lib/supabase/queries/notifications";
import { markEventAlertsRead } from "@/lib/supabase/queries/alert-reads";
import { eventHomePath } from "@/lib/events/routing";

export function ScopedAlertsClient({ eventId, slug, initialAlerts, initialLastReadAt }: {
  eventId: string; slug: string; initialAlerts: NotificationRow[]; initialLastReadAt: string | null;
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [readAt, setReadAt] = useState(initialLastReadAt);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const client = createClient();
    const refresh = async () => {
      try { setAlerts(await getNotifications(client, 50, eventId)); } catch { /* Preserve the last visible list. */ }
    };
    const channel = client.channel(`event-alerts-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [eventId]);

  async function markRead() {
    const client = createClient();
    try {
      await markEventAlertsRead(client, eventId);
      setReadAt(new Date().toISOString());
      setError(null);
    } catch { setError("Could not mark alerts as read. Please try again."); }
  }

  return <section className="mt-8 space-y-4" aria-label="Event alerts">
    <button type="button" className="platform-button text-sm" onClick={() => void markRead()}>Mark all as read</button>
    {error ? <p role="alert" className="text-sm">{error}</p> : null}
    {alerts.length === 0 ? <p className="text-muted">No alerts yet for this event.</p> : alerts.map((alert) => (
      <article key={alert.id} className="rounded-xl border p-5 platform-rule">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{alert.title}</h2>
          <time className="text-xs text-muted" dateTime={alert.created_at}>{new Date(alert.created_at).toLocaleString()}</time>
        </div>
        {alert.body ? <p className="mt-2 whitespace-pre-wrap text-sm">{alert.body}</p> : null}
        {(!readAt || alert.created_at > readAt) ? <span className="mt-2 inline-block text-xs font-semibold">Unread</span> : null}
        {alert.related_session_id ? <p className="mt-3"><Link className="platform-link text-sm" href={eventHomePath(slug)}>View event schedule</Link></p> : null}
      </article>
    ))}
  </section>;
}
