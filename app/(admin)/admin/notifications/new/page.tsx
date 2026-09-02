import { Typography } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminDashboard,
  searchAdminAttendees,
} from "@/lib/supabase/queries/admin";
import { NotificationComposer } from "@/components/admin/notification-composer";

export default async function NewAdminNotificationPage() {
  const supabase = await createClient();
  const [attendees, dashboard] = await Promise.all([
    searchAdminAttendees(supabase, "", 50),
    getAdminDashboard(supabase),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Compose alert
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Alerts are sent immediately after confirmation. Targeted alerts remain
        visible only to their snapshotted recipients.
      </Typography>
      <NotificationComposer
        initialAttendees={attendees}
        totalAttendees={dashboard.attendee_count}
        totalPushDevices={dashboard.push_device_count}
      />
    </div>
  );
}
