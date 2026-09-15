import Link from "next/link";
import { requireEventManager } from "@/lib/supabase/management-auth";
import { getEventSetupSummary } from "@/lib/supabase/queries/management";
import { eventManagePath, eventPublicPath } from "@/lib/events/routing";
import { LifecycleControls } from "@/components/manage/lifecycle-controls";
import { formatEventDate } from "@/lib/format";

export default async function ManagementOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { event, permissions, supabase } = await requireEventManager((await params).slug);
  const setup = await getEventSetupSummary(supabase, event);
  const rows = [
    ["Basics and dates", `${formatEventDate(event.startsAt, event.timezone)} — ${formatEventDate(event.endsAt, event.timezone)} · ${event.timezone}`],
    ["Branding", "Original Sync theme. Logo and cover customization follows in a later unit."],
    ["Schedule", setup ? `${setup.sessions} sessions · ${setup.publishedSessions} published. Editing follows in the content unit.` : "Unavailable while suspended."],
    ["Speakers", setup ? `${setup.speakers} directory entries. Editing follows in the content unit.` : "Unavailable while suspended."],
    ["Team", setup ? `1 owner · ${setup.admins} active admins · ${setup.pendingInvitations} pending invitations. Team controls follow in a later unit.` : "Unavailable while suspended."],
  ];
  return <div className="grid gap-10">
    <section>
      <h2 className="text-2xl font-bold tracking-tight">{event.lifecycle === "draft" ? "Draft setup" : "Event overview"}</h2>
      <p className="mt-3 max-w-xl leading-7 text-muted">Your event keeps its own content, people, and permissions. {event.lifecycle === "draft" ? "Review the basics and attendee preview before you publish." : "Review event details and lifecycle controls below."}</p>
      <dl className="mt-6">
        {rows.map(([label, description]) => <div key={label} className="border-t py-4 platform-rule">
          <dt className="font-semibold">{label}</dt><dd className="mt-1 text-sm leading-6 text-muted">{description}</dd>
          {label === "Basics and dates" ? <Link href={`${eventManagePath(event.slug)}/basics`} className="platform-link mt-2">{permissions.canManageContent ? "Edit basics" : "View basics"}</Link> : null}
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
