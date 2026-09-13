import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import { getBookmarkedSessionIds } from "@/lib/supabase/queries/program-flow";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { AlertsClient } from "@/components/alerts/alerts-client";
import { getUserEvents } from "@/lib/supabase/queries/events";
import { selectPreferredEvent } from "@/lib/events/routing";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export default async function AlertsPage() {
  const { user } = await requireCompleteProfile();
  if (isMultiTenantPlatformEnabled()) redirect("/events");

  const supabase = await createClient();
  const event = selectPreferredEvent(await getUserEvents(supabase, user.id));
  const [notifications, bookmarks] = await Promise.all([
    getNotifications(supabase),
    event ? getBookmarkedSessionIds(supabase, event.id) : Promise.resolve([]),
  ]);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-2xl lg:px-10 lg:pt-10">
        <AppHeader />
        <PageHeader
          title="Alerts"
          description="Automatic session updates, live the moment they happen."
        />
        <AlertsClient
          initialNotifications={notifications}
          initialBookmarkedIds={bookmarks}
          eventId={event?.id ?? null}
          eventSlug={event?.slug}
        />
      </div>
    </main>
  );
}
