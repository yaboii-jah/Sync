import { notFound } from "next/navigation";
import Link from "next/link";
import { requireEventManager } from "@/lib/supabase/management-auth";

export default async function AlertDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { event, supabase } = await requireEventManager(slug);
  const alert = await supabase.from("notifications").select("id,title,body,created_at,audience_kind").eq("event_id", event.id).eq("id", id).maybeSingle();
  if (alert.error) throw alert.error;
  if (!alert.data) notFound();
  const [recipients, dispatches, deliveries] = await Promise.all([
    supabase.from("notification_recipients").select("user_id").eq("event_id", event.id).eq("notification_id", id),
    supabase.from("notification_dispatches").select("status,attempt_count,last_error,created_at").eq("event_id", event.id).eq("notification_id", id),
    supabase.from("notification_deliveries").select("status").eq("event_id", event.id).eq("notification_id", id),
  ]);
  if (recipients.error) throw recipients.error;
  if (dispatches.error) throw dispatches.error;
  if (deliveries.error) throw deliveries.error;
  const counts = (deliveries.data ?? []).reduce<Record<string, number>>((acc, row) => { acc[row.status] = (acc[row.status] ?? 0) + 1; return acc; }, {});
  return <div>
    <Link className="platform-link text-sm" href={`/manage/${event.slug}/alerts`}>← Alerts</Link>
    <h2 className="organizer-heading mt-4">{alert.data.title}</h2>
    <p className="mt-2 text-xs text-muted">{new Date(alert.data.created_at).toLocaleString()} · {alert.data.audience_kind ?? "all"}</p>
    {alert.data.body ? <p className="mt-5 whitespace-pre-wrap">{alert.data.body}</p> : null}
    <section className="mt-8 rounded-xl border p-5 platform-rule" aria-label="Delivery summary">
      <h3 className="font-semibold">Delivery summary</h3>
      <p className="mt-2 text-sm">In-app recipients: {recipients.data?.length ?? 0}</p>
      <p className="mt-1 text-sm">Push dispatch: {dispatches.data?.[0]?.status ?? "not queued"}</p>
      <p className="mt-1 text-sm">Push results: {Object.entries(counts).map(([status, count]) => `${status} ${count}`).join(", ") || "none"}</p>
      {dispatches.data?.[0]?.last_error ? <p className="mt-2 text-xs text-muted">Transport status: {dispatches.data[0].last_error}</p> : null}
    </section>
  </div>;
}
