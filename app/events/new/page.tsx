import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PlatformShell } from "@/components/platform/platform-shell";
import { EventBasicsForm } from "@/components/manage/event-basics-form";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const metadata = { title: "Create event · Sync", robots: { index: false, follow: false } };

export default async function NewEventPage() {
  await connection();
  if (!isMultiTenantPlatformEnabled()) redirect("/home");
  await requireCompleteProfile();
  return <PlatformShell><div className="platform-frame py-10 sm:py-16">
    <h1 className="organizer-heading">Create your event</h1>
    <p className="mt-3 mb-10 max-w-xl leading-7 text-muted">Start with a private draft. You become its owner, and can preview the attendee experience before publishing.</p>
    <EventBasicsForm creating requestId={crypto.randomUUID()} initial={{ name: "", slug: "", description: "", venue: "", timezone: "UTC", startsAt: "", endsAt: "" }} />
  </div></PlatformShell>;
}
