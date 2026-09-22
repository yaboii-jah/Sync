import Link from "next/link";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { listPlatformEvents } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformEventsPage({ searchParams }: { searchParams: Promise<{ q?: string; lifecycle?: string; suspended?: string; cursorAt?: string; cursorId?: string }> }) {
  const params = await searchParams; const { supabase } = await requirePlatformSuperAdmin();
  const lifecycle = ["draft","published","archived"].includes(params.lifecycle ?? "") ? params.lifecycle! : null;
  const suspended = params.suspended === "true" ? true : params.suspended === "false" ? false : null;
  const rows = await listPlatformEvents(supabase, { search: params.q, lifecycle, suspended, cursorAt: params.cursorAt, cursorId: params.cursorId });
  const events = rows.slice(0, 25); const next = rows.length > 25 ? rows[24] : null;
  const nextParams = new URLSearchParams(); if (params.q) nextParams.set("q", params.q); if (lifecycle) nextParams.set("lifecycle", lifecycle); if (params.suspended) nextParams.set("suspended", params.suspended); if (next) { nextParams.set("cursorAt", next.updated_at); nextParams.set("cursorId", next.id); }
  return <div className="platform-frame py-10"><p className="platform-kicker">Tenant oversight</p><h1 className="platform-display mt-3">Events</h1>
    <form className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"><input className="organizer-input" name="q" defaultValue={params.q} placeholder="Search name or slug" aria-label="Search events" /><select className="organizer-input" name="lifecycle" defaultValue={lifecycle ?? ""}><option value="">All lifecycles</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><select className="organizer-input" name="suspended" defaultValue={params.suspended ?? ""}><option value="">Any safety state</option><option value="true">Suspended</option><option value="false">Not suspended</option></select><button className="platform-button">Filter</button></form>
    {events.length ? <ul className="mt-8">{events.map((event) => <li key={event.id} className="border-t py-5 platform-rule"><div className="flex flex-wrap justify-between gap-4"><div><Link className="text-xl font-semibold hover:underline" href={`/super-admin/events/${event.id}`}>{event.name}</Link><p className="mt-1 text-sm text-muted">{event.lifecycle}{event.suspended_at ? " · Suspended" : ""} · Owner: {event.owner_name || event.owner_email || "Unavailable"}</p><p className="mt-1 text-xs text-muted">{event.active_members} active members · {event.active_admins} admins · {event.sessions} sessions</p></div><Link className="platform-link" href={`/super-admin/events/${event.id}`}>Inspect</Link></div></li>)}</ul> : <p className="mt-8 text-muted">No events match these filters.</p>}{next ? <Link className="platform-button mt-7" href={`/super-admin/events?${nextParams}`}>Next page</Link> : null}
  </div>;
}
