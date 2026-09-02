import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, Chip, Separator, Typography } from "@heroui/react";
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

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
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

        <Chip variant="secondary">{dispatch?.status ?? "pending"}</Chip>
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
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <Typography type="body-sm" weight="medium">
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
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Typography type="body-sm" weight="medium">
                      {delivery.name ?? "Unknown attendee"}
                    </Typography>
                    <Chip
                      size="sm"
                      variant={
                        delivery.status === "accepted" ? "secondary" : "primary"
                      }
                    >
                      {delivery.status}
                    </Chip>
                  </div>
                  {delivery.error ? (
                    <Typography type="body-xs" color="muted" className="mt-1">
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
