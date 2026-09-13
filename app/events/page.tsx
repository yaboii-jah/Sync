import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import { eventHomePath, eventPublicPath } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getUserEvents, type UserEvent } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/format";
import { connection } from "next/server";
import { deriveEventPermissions } from "@/lib/events/types";

function EventRow({ event }: { event: UserEvent }) {
  const canManage = event.role === "owner" || event.role === "admin";
  const permissions = deriveEventPermissions(event.role, event.membershipStatus, event.lifecycle, event.isSuspended);
  const hasPublicPage = event.lifecycle === "published" && !event.isSuspended;
  return (
    <li className="platform-card">
      <div className="min-w-0">
        <h3 className="text-xl font-semibold tracking-[-0.025em]">{event.name}</h3>
        <span className="platform-kicker mt-2 block">{event.role}</span>
        <p className="mt-2 text-sm text-muted">
          {formatEventDate(event.startsAt, event.timezone)} · {event.venue ?? "Venue TBA"}
        </p>
        {canManage ? <p className="mt-1 text-xs text-muted">Management workspace follows in the next unit.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 sm:mt-0">
        {hasPublicPage ? <Link href={eventPublicPath(event.slug)} className="platform-link text-sm">Public page</Link> : null}
        {permissions.canViewAttendeeExperience ? <Link href={eventHomePath(event.slug)} className="platform-button text-sm">Open event</Link> : (
          <span className="platform-link text-sm" aria-disabled="true">Unavailable</span>
        )}
      </div>
    </li>
  );
}

export default async function EventsPage() {
  await connection();
  if (!isMultiTenantPlatformEnabled()) redirect("/home");
  const { user, profile } = await requireCompleteProfile();
  const events = await getUserEvents(await createClient(), user.id);
  const active = events.filter((event) => event.membershipStatus === "active" && event.lifecycle !== "archived");
  const archived = events.filter((event) => event.membershipStatus === "active" && event.lifecycle === "archived");

  return (
    <PlatformShell>
      <div className="platform-frame py-12 sm:py-20">
        <p className="platform-kicker">Your event index</p>
        <div className="mt-4 grid gap-6 border-b pb-10 platform-rule md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)] md:items-end">
          <h1 className="platform-display">Good to see you, {profile.name || "there"}.</h1>
          <p className="max-w-md text-base leading-7 text-muted">Every event keeps its own schedule, people, and permissions. Choose where you want to go.</p>
        </div>

        <section className="mt-12" aria-labelledby="active-events">
          <div>
            <h2 id="active-events" className="text-2xl font-semibold tracking-[-0.035em]">Current events</h2>
            <span className="platform-kicker mt-2 block">{active.length.toString().padStart(2, "0")} listed</span>
          </div>
          {active.length ? <ul className="mt-5">{active.map((event) => <EventRow key={event.id} event={event} />)}</ul> : (
            <div className="mt-5 border-t py-10 platform-rule">
              <p className="font-semibold">No current events yet.</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted">Open an organizer’s public event link to join it. Event creation will arrive with the management workspace.</p>
            </div>
          )}
        </section>

        {archived.length ? (
          <section className="mt-14" aria-labelledby="archived-events">
            <h2 id="archived-events" className="text-xl font-semibold tracking-[-0.025em]">Past events</h2>
            <ul className="mt-4">{archived.map((event) => <EventRow key={event.id} event={event} />)}</ul>
          </section>
        ) : null}
      </div>
    </PlatformShell>
  );
}
