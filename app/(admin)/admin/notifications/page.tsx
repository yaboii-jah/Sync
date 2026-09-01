import Link from "next/link";
import { Card, Chip, Separator, Typography } from "@heroui/react";
import { BellRing, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminNotifications } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-states";
import { primaryLinkClass } from "@/components/ui/link-button";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const notifications = await getAdminNotifications(supabase, 100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Typography.Heading level={1} className="text-2xl">
            Notification history
          </Typography.Heading>
          <Typography type="body-sm" color="muted" className="mt-1">
            Dispatch desk
          </Typography>
        </div>
        <Link href="/admin/notifications/new" className={primaryLinkClass}>
          <Send className="size-4" aria-hidden />
          New alert
        </Link>
      </div>

      <Card className="mt-8">
        {notifications.map((notification, index) => (
          <div key={notification.id}>
            {index > 0 ? <Separator /> : null}
            <Link
              href={`/admin/notifications/${notification.id}`}
              className="hover:bg-default block px-5 py-4 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="tertiary">
                      {notification.source.replaceAll("_", " ")}
                    </Chip>
                    <Typography type="body-xs" color="muted">
                      {formatRelativeTime(notification.created_at)}
                    </Typography>
                  </div>

                  <Typography type="body-sm" weight="semibold" className="mt-2">
                    {notification.title}
                  </Typography>

                  {notification.body ? (
                    <Typography
                      type="body-sm"
                      color="muted"
                      className="mt-1 line-clamp-2"
                    >
                      {notification.body}
                    </Typography>
                  ) : null}
                </div>

                <dl className="flex gap-6 text-right">
                  {[
                    ["People", notification.recipient_count],
                    ["Accepted", notification.accepted_count ?? 0],
                    ["Failed", notification.failed_count ?? 0],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dd className="text-lg font-semibold tabular-nums">
                        {value}
                      </dd>
                      <dt>
                        <Typography type="body-xs" color="muted">
                          {label}
                        </Typography>
                      </dt>
                    </div>
                  ))}
                </dl>
              </div>
            </Link>
          </div>
        ))}

        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellRing />}
            title="No notification history yet"
            description="Alerts you send will be listed here with their delivery results."
          />
        ) : null}
      </Card>
    </div>
  );
}
