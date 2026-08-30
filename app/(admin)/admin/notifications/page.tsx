import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminNotifications } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const notifications = await getAdminNotifications(supabase, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">Dispatch desk</p>
          <h1 className="mt-2 font-display text-4xl text-text-primary uppercase">Notification history</h1>
        </div>
        <Link
          href="/admin/notifications/new"
          className="flex items-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-wide text-charcoal uppercase hover:bg-light-green"
        >
          <Send className="h-4 w-4" />
          New alert
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border-default">
        {notifications.map((notification, index) => (
          <Link
            key={notification.id}
            href={`/admin/notifications/${notification.id}`}
            className={`block px-4 py-4 transition-colors hover:bg-accent-primary/15 sm:px-5 ${
              index > 0 ? "border-t border-border-default" : ""
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border-default px-2 py-1 text-[0.58rem] font-bold tracking-wide text-text-muted uppercase">
                    {notification.source.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-text-muted">{formatRelativeTime(notification.created_at)}</span>
                </div>
                <p className="mt-2 font-bold text-text-primary">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-1 line-clamp-2 text-sm text-text-muted">{notification.body}</p>
                ) : null}
              </div>
              <div className="flex gap-4 text-right text-xs text-text-muted">
                <span><strong className="block text-lg text-text-primary">{notification.recipient_count}</strong>people</span>
                <span><strong className="block text-lg text-state-success">{notification.accepted_count ?? 0}</strong>accepted</span>
                <span><strong className="block text-lg text-state-error">{notification.failed_count ?? 0}</strong>failed</span>
              </div>
            </div>
          </Link>
        ))}
        {notifications.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-muted">No notification history yet.</p>
        ) : null}
      </div>
    </div>
  );
}
