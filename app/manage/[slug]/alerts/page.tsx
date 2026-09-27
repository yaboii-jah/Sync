import Link from "next/link";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { AlertComposer } from "@/components/manage/alert-composer";

export default async function ManageAlertsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { event, supabase } = await requireEventManager((await params).slug);
  const [memberships, notifications] = await Promise.all([
    supabase.from("event_memberships").select("id,user_id,role,status,display_name_snapshot").eq("event_id", event.id).eq("status", "active").not("user_id", "is", null).order("created_at"),
    supabase.from("notifications").select("id,title,body,created_at,audience_kind").eq("event_id", event.id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (memberships.error) throw memberships.error;
  if (notifications.error) throw notifications.error;
  const members = (memberships.data ?? []).map((member) => ({ id: member.id, name: member.display_name_snapshot || member.user_id || "Member", role: member.role }));
  const writable = event.lifecycle === "published" && !event.isSuspended;
  return <div>
    <p className="platform-kicker">Event communications</p>
    <h2 className="organizer-heading mt-2">Alerts</h2>
    <p className="mt-2 text-sm text-muted">Send in-app announcements to active members. Push is delivered only to members who opted in for this event.</p>
    <AlertComposer slug={event.slug} members={members} writable={writable} />
    <section className="mt-10" aria-label="Alert history">
      <h3 className="text-lg font-semibold">History</h3>
      {(notifications.data ?? []).length === 0 ? <p className="mt-3 text-sm text-muted">No alerts yet.</p> :
        <div className="mt-4 space-y-3">{(notifications.data ?? []).map((alert) =>
          <article key={alert.id} className="rounded-xl border p-4 platform-rule">
            <Link className="platform-link font-semibold" href={`/manage/${event.slug}/alerts/${alert.id}`}>{alert.title}</Link>
            <p className="mt-1 text-xs text-muted">{new Date(alert.created_at).toLocaleString()} · {alert.audience_kind ?? "all"}</p>
            {alert.body ? <p className="mt-2 text-sm">{alert.body}</p> : null}
          </article>)}</div>}
    </section>
  </div>;
}
