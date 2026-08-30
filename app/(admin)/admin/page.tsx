import Link from "next/link";
import { AlertTriangle, BellRing, Radio, Send, Users, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminAudit,
  getAdminDashboard,
  getAdminNotifications,
} from "@/lib/supabase/queries/admin";
import { formatManilaTime, formatRelativeTime } from "@/lib/format";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [dashboard, notifications, audit] = await Promise.all([
    getAdminDashboard(supabase),
    getAdminNotifications(supabase, 5),
    getAdminAudit(supabase, 5),
  ]);

  const metrics = [
    { label: "Attendees", value: dashboard.attendee_count, icon: Users },
    { label: "Push reachable", value: dashboard.push_enabled_attendees, icon: Wifi },
    { label: "Active devices", value: dashboard.push_device_count, icon: BellRing },
    { label: "Manual overrides", value: dashboard.override_count, icon: Radio },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">
            Live operations
          </p>
          <h1 className="mt-2 font-display text-4xl text-text-primary uppercase lg:text-5xl">
            Event pulse
          </h1>
        </div>
        <Link
          href="/admin/notifications/new"
          className="flex items-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-colors hover:bg-light-green"
        >
          <Send className="h-4 w-4" />
          New alert
        </Link>
      </div>

      {dashboard.failed_dispatch_count > 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-state-error bg-state-error/10 px-4 py-3 text-state-error">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">
            {dashboard.failed_dispatch_count} push dispatch
            {dashboard.failed_dispatch_count === 1 ? " needs" : "es need"} attention.
          </p>
        </div>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-border-default px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold tracking-wide text-text-muted uppercase">
                  {metric.label}
                </p>
                <Icon className="h-5 w-5 text-pastel-yellow" />
              </div>
              <p className="mt-3 font-display text-4xl text-text-primary">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border-default px-5 py-5">
          <p className="text-xs font-bold tracking-[0.2em] text-pastel-yellow uppercase">
            Happening now
          </p>
          {dashboard.current_session ? (
            <>
              <h2 className="mt-3 font-display text-3xl text-text-primary uppercase">
                {dashboard.current_session.title}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {dashboard.current_session.room ?? "TBA"}
                {dashboard.current_session.actual_started_at
                  ? ` · started ${formatRelativeTime(dashboard.current_session.actual_started_at)}`
                  : ` · ${formatManilaTime(dashboard.current_session.start_time)}`}
              </p>
              {dashboard.current_session.status_override ? (
                <p className="mt-4 inline-flex rounded-full border border-pastel-yellow px-3 py-1 text-[0.65rem] font-bold tracking-wide text-pastel-yellow uppercase">
                  Manual override
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-text-muted">No session is currently marked ongoing.</p>
          )}
        </article>

        <article className="rounded-2xl border border-border-default px-5 py-5">
          <p className="text-xs font-bold tracking-[0.2em] text-text-muted uppercase">Up next</p>
          {dashboard.next_session ? (
            <>
              <h2 className="mt-3 font-display text-3xl text-text-primary uppercase">
                {dashboard.next_session.title}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {formatManilaTime(dashboard.next_session.start_time)} · {dashboard.next_session.room ?? "TBA"}
              </p>
            </>
          ) : (
            <p className="mt-4 text-sm text-text-muted">No upcoming session remains.</p>
          )}
        </article>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">Recent notifications</h2>
            <Link href="/admin/notifications" className="text-xs font-bold text-pastel-yellow">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={`/admin/notifications/${notification.id}`}
                className="rounded-2xl border border-border-default px-4 py-4 transition-colors hover:bg-accent-primary/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-text-primary">{notification.title}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {notification.recipient_count} recipients · {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border-default px-2 py-1 text-[0.6rem] font-bold tracking-wide text-text-muted uppercase">
                    {notification.dispatch_status ?? "pending"}
                  </span>
                </div>
              </Link>
            ))}
            {notifications.length === 0 ? (
              <p className="rounded-2xl border border-border-default px-4 py-6 text-sm text-text-muted">
                No notifications have been created yet.
              </p>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text-primary">Recent admin actions</h2>
            <Link href="/admin/audit" className="text-xs font-bold text-pastel-yellow">
              Full audit
            </Link>
          </div>
          <div className="mt-3 rounded-2xl border border-border-default">
            {audit.map((entry, index) => (
              <div
                key={entry.id}
                className={`px-4 py-3 ${index > 0 ? "border-t border-border-default" : ""}`}
              >
                <p className="text-sm font-bold text-text-primary">{entry.action.replaceAll(".", " ")}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {entry.actor_name} · {formatRelativeTime(entry.created_at)}
                </p>
              </div>
            ))}
            {audit.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-muted">No admin mutations recorded.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
