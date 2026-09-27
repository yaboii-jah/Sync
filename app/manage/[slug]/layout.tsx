import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PlatformShell } from "@/components/platform/platform-shell";
import { eventHomePath, eventManagePath } from "@/lib/events/routing";
import { requireEventManager } from "@/lib/supabase/management-auth";

export const metadata = { title: "Manage event · Sync", robots: { index: false, follow: false } };

export default async function ManagementLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  await connection();
  const { event, permissions } = await requireEventManager((await params).slug);
  return <PlatformShell><div className="platform-frame py-8 sm:py-12">
    <div className="border-b pb-6 platform-rule">
      <p className="text-sm text-muted">Managing as {event.role} · {event.lifecycle}</p>
      <h1 className="organizer-heading mt-2">{event.name}</h1>
      {event.isSuspended || event.lifecycle === "archived" ? <p role="status" className="mt-4 font-semibold">{event.isSuspended ? "Suspended by the platform. Management is read-only." : "Archived. Event history is preserved and management is read-only."}</p> : null}
    </div>
    <div className="organizer-workspace mt-8">
      <nav aria-label="Event management" className="flex flex-wrap gap-3 lg:flex-col lg:items-start">
        <Link className="platform-link" href={eventManagePath(event.slug)}>Overview</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/basics`}>Event basics</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/branding`}>Branding</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/schedule`}>Schedule</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/speakers`}>Speakers</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/team`}>Team</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/alerts`}>Alerts</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/feedback`}>Feedback</Link>
        <Link className="platform-link" href={`${eventManagePath(event.slug)}/raffle`}>Raffle export</Link>
        {permissions.canViewAttendeeExperience ? <Link className="platform-link" href={eventHomePath(event.slug)}>Attendee preview</Link> : null}
        <Link className="platform-link" href="/events">All events</Link>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  </div></PlatformShell>;
}
