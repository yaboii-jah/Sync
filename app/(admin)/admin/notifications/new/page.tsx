import { createClient } from "@/lib/supabase/server";
import { getAdminDashboard, searchAdminAttendees } from "@/lib/supabase/queries/admin";
import { NotificationComposer } from "@/components/admin/notification-composer";

export default async function NewAdminNotificationPage() {
  const supabase = await createClient();
  const [attendees, dashboard] = await Promise.all([
    searchAdminAttendees(supabase, "", 50),
    getAdminDashboard(supabase),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-10 lg:py-10">
      <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">Immediate dispatch</p>
      <h1 className="mt-2 font-display text-4xl text-text-primary uppercase">Compose alert</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
        Alerts are sent immediately after confirmation. Targeted alerts remain visible only to their snapshotted recipients.
      </p>
      <NotificationComposer
        initialAttendees={attendees}
        totalAttendees={dashboard.attendee_count}
        totalPushDevices={dashboard.push_device_count}
      />
    </div>
  );
}
