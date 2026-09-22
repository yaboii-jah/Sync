import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotaForm, SupportStartForm, SuspensionForm } from "@/components/platform-admin/operation-forms";
import { requirePlatformSuperAdmin } from "@/lib/supabase/platform-admin-auth";
import { getPlatformEvent } from "@/lib/supabase/queries/platform-admin";

export default async function PlatformEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { supabase } = await requirePlatformSuperAdmin(); const event = await getPlatformEvent(supabase, id); if (!event) notFound();
  return <div className="platform-frame py-10"><Link className="platform-link" href="/super-admin/events">← Events</Link><p className="platform-kicker mt-8">Tenant record</p><h1 className="platform-display mt-3">{event.name}</h1><p className="mt-3 text-muted">/{event.slug} · {event.lifecycle}{event.suspended_at ? " · Suspended" : ""}</p>
    <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border platform-rule sm:grid-cols-2 lg:grid-cols-4">{[["Owner",event.owner_name || event.owner_email || "Unavailable"],["Active attendees",event.active_attendees],["Admins",event.active_admins],["Sessions",event.sessions],["Speakers",event.speakers],["Timezone",event.timezone],["Starts",new Date(event.starts_at).toLocaleString()],["Ends",new Date(event.ends_at).toLocaleString()]].map(([label,val]) => <div className="bg-surface p-4" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold break-words">{val}</dd></div>)}</dl>
    <section className="mt-12 border-t pt-8 platform-rule"><h2 className="text-2xl font-semibold">Safety state</h2><p className="my-4 max-w-2xl text-muted">Suspension is independent from lifecycle and makes event experiences and management read-only.</p><SuspensionForm eventId={event.id} suspended={!!event.suspended_at} /></section>
    <section className="mt-12 border-t pt-8 platform-rule"><h2 className="text-2xl font-semibold">Owner quotas</h2><p className="my-4 text-muted">Overrides apply to every event owned by {event.owner_name || "this owner"}.</p>{event.owner_user_id ? <QuotaForm userId={event.owner_user_id} quota={event} /> : <p className="text-muted">This event has no active owner.</p>}</section>
    <section className="mt-12 border-t pt-8 platform-rule"><h2 className="text-2xl font-semibold">Audited support</h2>{event.active_support_session_id ? <div className="mt-4"><p className="text-success">Support access is active until {new Date(event.active_support_expires_at!).toLocaleString()}.</p><Link className="platform-button mt-4" href={`/super-admin/events/${event.id}/support`}>Open support view</Link></div> : <><p className="my-4 max-w-2xl text-muted">Starting support closes any other live support session you hold and grants attendee-only inspection for 60 minutes.</p><SupportStartForm eventId={event.id} /></>}</section>
  </div>;
}
