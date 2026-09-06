import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, Chip, Separator, Typography } from "@/components/ui/static";
import {
  ArrowLeft,
  CheckCircle2,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminNotification } from "@/lib/supabase/queries/admin";
import { formatRelativeTime } from "@/lib/format";
import { DispatchRefresh } from "@/components/admin/dispatch-refresh";

function dispatchTone(status: string | null) {
  if (status === "failed") return "danger" as const;
  if (status === "completed") return "success" as const;
  if (status === "pending" || status === "claimed") return "warning" as const;
  return "default" as const;
}

export default async function AdminNotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const detail = await getAdminNotification(supabase, id);
  if (!detail?.notification) notFound();

  const dispatch = detail.dispatch;
  const metrics = [
    { label: "Recipients", value: detail.recipients.length, icon: Users },
    {
      label: "Devices",
      value: dispatch?.target_device_count ?? 0,
      icon: Smartphone,
    },
    {
      label: "Accepted",
      value: dispatch?.accepted_count ?? 0,
      icon: CheckCircle2,
    },
    {
      label: "Failed",
      value: (dispatch?.failed_count ?? 0) + (dispatch?.pruned_count ?? 0),
      icon: XCircle,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <DispatchRefresh status={dispatch?.status ?? null} />

      <Link
        href="/admin/notifications"
        className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Notification history
      </Link>

      <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="tertiary">
              {detail.notification.source.replaceAll("_", " ")}
            </Chip>
            <Typography type="body-xs" color="muted">
              {formatRelativeTime(detail.notification.created_at)}
            </Typography>
          </div>

          <Typography.Heading level={1} className="mt-3 text-2xl">
            {detail.notification.title}
          </Typography.Heading>

          {detail.notification.body ? (
            <Typography type="body-sm" color="muted" className="mt-2">
              {detail.notification.body}
            </Typography>
          ) : null}
        </div>

        <Chip color={dispatchTone(dispatch?.status ?? null)} variant="soft">
          {dispatch?.status ?? "pending"}
        </Chip>
      </div>

      {dispatch?.last_error ? (
        <Alert status="danger" className="mt-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Dispatch error</Alert.Title>
            <Alert.Description>{dispatch.last_error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <Card.Content className="py-4">
                <Icon className="text-muted size-5" aria-hidden />
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {metric.value}
                </p>
                <Typography type="body-xs" color="muted" className="mt-1">
                  {metric.label}
                </Typography>
              </Card.Content>
            </Card>
          );
        })}
      </section>

      <Typography type="body-xs" color="muted" className="mt-4 max-w-3xl">
        Accepted means the push service received the message. It does not prove
        the device displayed it. {dispatch?.no_subscription_count ?? 0}{" "}
        recipients had no active push subscription but still received the in-app
        alert.
      </Typography>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <Typography.Heading level={2} className="text-base">
            Recipient snapshot
          </Typography.Heading>
          <Card className="mt-3 max-h-[32rem] overflow-y-auto">
            {detail.recipients.map((recipient, index) => (
              <div key={recipient.id}>
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
                  <Typography type="body-sm" weight="medium" className="min-w-0 break-words">
                    {recipient.name || "Unnamed attendee"}
                  </Typography>
                  <Typography type="body-xs" color="muted">
                    {recipient.push_device_count} devices
                  </Typography>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <Typography.Heading level={2} className="text-base">
            Device attempts
          </Typography.Heading>
          <Card className="mt-3 max-h-[32rem] overflow-y-auto">
            {detail.deliveries.map((delivery, index) => (
              <div key={`${delivery.user_id}-${delivery.device_id}`}>
                {index > 0 ? <Separator /> : null}
                <div className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography type="body-sm" weight="medium" className="min-w-0 break-words">
                      {delivery.name ?? "Unknown attendee"}
                    </Typography>
                    <Chip size="sm" color={delivery.status === "accepted" ? "success" : "danger"} variant="soft">
                      {delivery.status}
                    </Chip>
                  </div>
                  <Typography type="body-xs" color="muted" className="mt-1">
                    {formatRelativeTime(delivery.attempted_at)}
                    {delivery.status_code ? ` · HTTP ${delivery.status_code}` : ""}
                  </Typography>
                  {delivery.error ? (
                    <Typography type="body-xs" color="muted" className="mt-1 break-words">
                      {delivery.error}
                    </Typography>
                  ) : null}
                </div>
              </div>
            ))}

            {detail.deliveries.length === 0 ? (
              <div className="px-5 py-6">
                <Typography type="body-sm" color="muted">
                  No device attempts recorded yet.
                </Typography>
              </div>
            ) : null}
          </Card>
        </section>
      </div>
    </div>
  );
}
