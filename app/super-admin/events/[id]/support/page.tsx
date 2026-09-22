import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeeModerationForm, SupportEndForm } from "@/components/platform-admin/operation-forms";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { getPlatformEvent, listPlatformAttendees } from "@/lib/supabase/queries/platform-admin";

export default async function SupportEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; status?: string; cursorAt?: string; cursorId?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]); const { supabase } = await requirePlatformSuperAdmin(); const event = await getPlatformEvent(supabase, id); if (!event) notFound();
  const status = ["active","left","removed","blocked"].includes(query.status ?? "") ? query.status! : null;
  if (!event.active_support_session_id) return <div className="platform-frame py-10"><h1 className="platform-display">Support access ended</h1><p className="mt-4 text-muted">Start a new reason-gated session before viewing tenant attendee data.</p><Link className="platform-link mt-5" href={`/super-admin/events/${id}`}>Back to event record</Link></div>;
  const rows = await listPlatformAttendees(supabase, id, { search: query.q, status, cursorAt: query.cursorAt, cursorId: query.cursorId }); const attendees = rows.slice(0,25); const next = rows.length > 25 ? rows[24] : null;
  const nextParams = new URLSearchParams(); if(query.q)nextParams.set("q",query.q);if(status)nextParams.set("status",status);if(next){nextParams.set("cursorAt",next.joined_at);nextParams.set("cursorId",next.id);}
  const readOnly = event.lifecycle === "archived" || !!event.suspended_at;
  return <div className="platform-frame py-10"><div className="rounded-2xl border border-warning bg-warning/10 p-5"><p className="platform-kicker">Temporary support access</p><h1 className="mt-2 text-3xl font-bold">{event.name}</h1><p className="mt-2 text-sm">Expires {new Date(event.active_support_expires_at!).toLocaleString()}. This view grants attendee moderation only.</p><div className="mt-4"><SupportEndForm eventId={id} sessionId={event.active_support_session_id} /></div></div>
    {readOnly ? <p className="mt-6 text-warning">This event is {event.suspended_at ? "suspended" : "archived"}; attendee mutations are disabled.</p> : null}
    <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]"><input className="organizer-input" name="q" defaultValue={query.q} placeholder="Search attendee name or email" aria-label="Search attendees" /><select className="organizer-input" name="status" defaultValue={status ?? ""}><option value="">All statuses</option><option value="active">Active</option><option value="left">Left</option><option value="removed">Removed</option><option value="blocked">Blocked</option></select><button className="platform-button">Filter</button></form>
    <ul className="mt-8 grid gap-4">{attendees.map((attendee) => <li key={attendee.id} className="platform-card"><div><p className="font-semibold">{attendee.name || "Unnamed attendee"}</p><p className="text-sm text-muted break-all">{attendee.email ?? "No retained email"} · {attendee.status}</p>{!readOnly && attendee.status !== "left" ? <AttendeeModerationForm eventId={id} membershipId={attendee.id} currentStatus={attendee.status} /> : null}</div></li>)}</ul>
    {!attendees.length ? <p className="mt-8 text-muted">No attendees match these filters.</p> : null}{next ? <Link className="platform-button mt-7" href={`/super-admin/events/${id}/support?${nextParams}`}>Next page</Link> : null}
  </div>;
}
