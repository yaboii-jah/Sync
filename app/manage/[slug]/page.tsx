import Link from "next/link";
import { LifecycleControls } from "@/components/manage/lifecycle-controls";
import { eventManagePath, eventPublicPath } from "@/lib/events/routing";
import { formatEventDate } from "@/lib/format";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getEventSetupSummary } from "@/lib/supabase/queries/management";

export default async function ManagementOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, supabase } = await requireEventManager((await params).slug);
  const setup = await getEventSetupSummary(supabase, event);
  const managePath = eventManagePath(event.slug);
  const rows = [
    { label: "Basics and dates", description: `${formatEventDate(event.startsAt, event.timezone)} — ${formatEventDate(event.endsAt, event.timezone)} · ${event.timezone}`, href: `${managePath}/basics`, action: permissions.canManageContent ? "Edit basics" : "View basics" },
    { label: "Branding", description: event.logoPath || event.coverPath ? "Custom event artwork is active." : "Using the original Sync theme without custom artwork.", href: `${managePath}/branding`, action: permissions.canManageContent ? "Manage branding" : "View branding" },
    { label: "Schedule", description: setup ? `${setup.sessions} sessions · ${setup.publishedSessions} published.` : "Unavailable while suspended.", href: `${managePath}/schedule`, action: permissions.canManageContent ? "Manage schedule" : "View schedule" },
    { label: "Speakers", description: setup ? `${setup.speakers} directory entries.` : "Unavailable while suspended.", href: `${managePath}/speakers`, action: permissions.canManageContent ? "Manage speakers" : "View speakers" },
    { label: "Team", description: setup ? `1 owner · ${setup.admins} active admins · ${setup.pendingInvitations} pending invitations.` : "Unavailable while suspended.", href: `${managePath}/team`, action: permissions.canManageAdmins ? "Manage team" : "View team" },
  ];
  return <div className="grid gap-10">
    <section>
      <h2 className="text-2xl font-bold tracking-tight">{event.lifecycle === "draft" ? "Draft setup" : "Event overview"}</h2>
      <p className="mt-3 max-w-xl leading-7 text-muted">Your event keeps its own content, people, and permissions. {event.lifecycle === "draft" ? "Review the basics, schedule, speakers, and attendee preview before you publish." : "Review event details and lifecycle controls below."}</p>
      <dl className="mt-6">
        {rows.map((row) => <div key={row.label} className="border-t py-4 platform-rule">
          <dt className="font-semibold">{row.label}</dt><dd className="mt-1 text-sm leading-6 text-muted">{row.description}</dd>
          {row.href ? <Link href={row.href} className="platform-link mt-2">{row.action}</Link> : null}
        </div>)}
      </dl>
      {event.lifecycle === "published" && !event.isSuspended ? <p className="mt-4 text-sm"><Link className="platform-link" href={eventPublicPath(event.slug)}>Open public page</Link><span className="block text-muted break-all">Unlisted URL: /e/{event.slug}</span></p> : null}
    </section>
    <section className="border-t pt-6 platform-rule">
      <h2 className="mb-5 text-2xl font-bold tracking-tight">Lifecycle</h2>
      <LifecycleControls event={event} permissions={permissions} requestIds={[crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]} />
    </section>
  </div>;
}
