import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Smartphone, TriangleAlert, Users, XCircle } from "lucide-react";
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
    { label: "Recipients", value: detail.recipients.length, icon: Users, tone: "text-text-primary" },
    { label: "Devices", value: dispatch?.target_device_count ?? 0, icon: Smartphone, tone: "text-text-primary" },
    { label: "Accepted", value: dispatch?.accepted_count ?? 0, icon: CheckCircle2, tone: "text-state-success" },
    { label: "Failed", value: (dispatch?.failed_count ?? 0) + (dispatch?.pruned_count ?? 0), icon: XCircle, tone: "text-state-error" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <DispatchRefresh status={dispatch?.status ?? null} />
      <Link href="/admin/notifications" className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Notification history
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border-default px-2 py-1 text-[0.6rem] font-bold tracking-wide text-pastel-yellow uppercase">
              {detail.notification.source.replaceAll("_", " ")}
            </span>
            <span className="text-xs text-text-muted">{formatRelativeTime(detail.notification.created_at)}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl text-text-primary uppercase">{detail.notification.title}</h1>
          {detail.notification.body ? <p className="mt-3 leading-relaxed text-text-muted">{detail.notification.body}</p> : null}
        </div>
        <span className="rounded-full border border-border-default px-3 py-2 text-xs font-bold tracking-wide text-text-muted uppercase">
          {dispatch?.status ?? "pending"}
        </span>
      </div>

      {dispatch?.last_error ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-state-error bg-state-error/10 px-4 py-4 text-state-error">
          <TriangleAlert className="h-5 w-5 shrink-0" />
          <p className="text-sm">{dispatch.last_error}</p>
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-border-default px-4 py-4">
              <Icon className={`h-5 w-5 ${metric.tone}`} />
              <p className={`mt-3 font-display text-3xl ${metric.tone}`}>{metric.value}</p>
              <p className="mt-1 text-xs font-bold tracking-wide text-text-muted uppercase">{metric.label}</p>
            </article>
          );
        })}
      </section>

      <p className="mt-4 text-xs text-text-muted">
        Accepted means the push service received the message. It does not prove the device displayed it. {dispatch?.no_subscription_count ?? 0} recipients had no active push subscription but still received the in-app alert.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="text-sm font-bold text-text-primary">Recipient snapshot</h2>
          <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-2xl border border-border-default">
            {detail.recipients.map((recipient, index) => (
              <div key={recipient.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 0 ? "border-t border-border-default" : ""}`}>
                <p className="text-sm font-bold text-text-primary">{recipient.name || "Unnamed attendee"}</p>
                <p className="text-xs text-text-muted">{recipient.push_device_count} devices</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-text-primary">Device attempts</h2>
          <div className="mt-3 max-h-[32rem] overflow-y-auto rounded-2xl border border-border-default">
            {detail.deliveries.map((delivery, index) => (
              <div key={`${delivery.user_id}-${delivery.device_id}`} className={`px-4 py-3 ${index > 0 ? "border-t border-border-default" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-text-primary">{delivery.name ?? "Unknown attendee"}</p>
                  <span className={`text-[0.65rem] font-bold tracking-wide uppercase ${delivery.status === "accepted" ? "text-state-success" : "text-state-error"}`}>
                    {delivery.status}
                  </span>
                </div>
                {delivery.error ? <p className="mt-1 text-xs text-state-error">{delivery.error}</p> : null}
              </div>
            ))}
            {detail.deliveries.length === 0 ? <p className="px-4 py-6 text-sm text-text-muted">No device attempts recorded yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
