import Link from "next/link";
import { Alert, Card, Chip, Separator, Typography } from "@/components/ui/static";
import { BellRing, Radio, Send, Users, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminAudit,
  getAdminDashboard,
  getAdminNotifications,
} from "@/lib/supabase/queries/admin";
import { formatManilaTime, formatRelativeTime } from "@/lib/format";
import { primaryLinkClass } from "@/components/ui/link-button";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [dashboard, notifications, audit] = await Promise.all([
    getAdminDashboard(supabase),
    getAdminNotifications(supabase, 5),
    getAdminAudit(supabase, 5),
  ]);

  const metrics = [
    { label: "Attendees", value: dashboard.attendee_count, icon: Users },
    {
      label: "Push reachable",
      value: dashboard.push_enabled_attendees,
      icon: Wifi,
    },
    {
      label: "Active devices",
      value: dashboard.push_device_count,
      icon: BellRing,
    },
    { label: "Manual overrides", value: dashboard.override_count, icon: Radio },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Heading level={1} className="text-2xl">
            Event pulse
          </Typography.Heading>
          <Typography type="body-sm" color="muted" className="mt-1">
            Live operations
          </Typography>
        </div>
        <Link href="/admin/notifications/new" className={primaryLinkClass}>
          <Send className="size-4" aria-hidden />
          New alert
        </Link>
      </div>

      {dashboard.failed_dispatch_count > 0 ? (
        <Alert status="danger" className="mt-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Push dispatch needs attention</Alert.Title>
            <Alert.Description>
              {dashboard.failed_dispatch_count} dispatch
              {dashboard.failed_dispatch_count === 1 ? "" : "es"} did not go out
              cleanly.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <Card.Content className="py-5">
                <div className="flex items-center justify-between gap-3">
                  <Typography type="body-sm" color="muted">
                    {metric.label}
                  </Typography>
                  <Icon className="text-muted size-5" aria-hidden />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {metric.value}
                </p>
              </Card.Content>
            </Card>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Description>Happening now</Card.Description>
            <Card.Title>
              {dashboard.current_sessions.length > 0
                ? `${dashboard.current_sessions.length} session${dashboard.current_sessions.length === 1 ? "" : "s"} live`
                : "Nothing is live"}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
            {dashboard.current_sessions.length > 0 ? (
              dashboard.current_sessions.map((session, index) => (
                <div key={session.id}>
                  {index > 0 ? <Separator className="my-2" /> : null}
                  <Typography type="body-sm" weight="medium">
                    {session.title}
                  </Typography>
                  <Typography type="body-sm" color="muted" className="mt-1">
                    {session.room ?? "TBA"}
                    {session.actual_started_at
                      ? `, started ${formatRelativeTime(session.actual_started_at)}`
                      : `, ${formatManilaTime(session.start_time)}`}
                  </Typography>
                  {session.status_override ? (
                    <div className="mt-2">
                      <Chip size="sm" variant="tertiary">
                        Manual override
                      </Chip>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <Typography type="body-sm" color="muted">
                No session is currently marked ongoing.
              </Typography>
            )}
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Description>Up next</Card.Description>
            <Card.Title>
              {dashboard.next_sessions.length > 0
                ? `${dashboard.next_sessions.length} session${dashboard.next_sessions.length === 1 ? "" : "s"} next`
                : "Nothing upcoming"}
            </Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2">
            {dashboard.next_sessions.length > 0 ? (
              dashboard.next_sessions.map((session, index) => (
                <div key={session.id}>
                  {index > 0 ? <Separator className="my-2" /> : null}
                  <Typography type="body-sm" weight="medium">
                    {session.title}
                  </Typography>
                  <Typography type="body-sm" color="muted" className="mt-1">
                    {formatManilaTime(session.start_time)}, {session.room ?? "TBA"}
                  </Typography>
                </div>
              ))
            ) : (
              <Typography type="body-sm" color="muted">
                No upcoming session remains.
              </Typography>
            )}
          </Card.Content>
        </Card>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section>
          <div className="flex items-center justify-between">
            <Typography.Heading level={2} className="text-base">
              Recent notifications
            </Typography.Heading>
            <Link
              href="/admin/notifications"
              className="text-muted hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <Link
                  href={`/admin/notifications/${notification.id}`}
                  className="block px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Typography type="body-sm" weight="semibold">
                        {notification.title}
                      </Typography>
                      <Typography type="body-xs" color="muted" className="mt-1">
                        {notification.recipient_count} recipients,{" "}
                        {formatRelativeTime(notification.created_at)}
                      </Typography>
                    </div>
                    <Chip size="sm" variant="tertiary">
                      {notification.dispatch_status ?? "pending"}
                    </Chip>
                  </div>
                </Link>
              </Card>
            ))}

            {notifications.length === 0 ? (
              <Card>
                <Card.Content className="py-6">
                  <Typography type="body-sm" color="muted">
                    No notifications have been created yet.
                  </Typography>
                </Card.Content>
              </Card>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <Typography.Heading level={2} className="text-base">
              Recent admin actions
            </Typography.Heading>
            <Link
              href="/admin/audit"
              className="text-muted hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Full audit
            </Link>
          </div>

          <Card className="mt-3">
            {audit.map((entry, index) => (
              <div key={entry.id}>
                {index > 0 ? <Separator /> : null}
                <div className="px-5 py-3">
                  <Typography type="body-sm" weight="medium">
                    {entry.action.replaceAll(".", " ")}
                  </Typography>
                  <Typography type="body-xs" color="muted" className="mt-1">
                    {entry.actor_name}, {formatRelativeTime(entry.created_at)}
                  </Typography>
                </div>
              </div>
            ))}

            {audit.length === 0 ? (
              <div className="px-5 py-6">
                <Typography type="body-sm" color="muted">
                  No admin mutations recorded.
                </Typography>
              </div>
            ) : null}
          </Card>
        </section>
      </div>
    </div>
  );
}
