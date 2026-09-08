import { BellRing, Users, Wifi } from "lucide-react";
import { Typography } from "@/components/ui/static";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminDashboard,
  searchAdminAttendees,
} from "@/lib/supabase/queries/admin";
import { AttendeeDirectory } from "@/components/admin/attendee-directory";
import { MetricCards } from "@/components/admin/metric-cards";

export default async function AdminAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const supabase = await createClient();

  /*
   * The directory list is capped and search-filtered, so it cannot supply the
   * totals. `admin_get_dashboard` already counts every attendee, so the KPI row
   * reads the same numbers as the Overview rather than a second definition.
   */
  const [dashboard, attendees] = await Promise.all([
    getAdminDashboard(supabase),
    searchAdminAttendees(supabase, q, 50),
  ]);

  const metrics = [
    { label: "Attendees", value: dashboard.attendee_count, icon: Users },
    {
      label: "Push reachable",
      value: dashboard.push_enabled_attendees,
      icon: Wifi,
    },
    {
      label: "Active devices",
      value: dashboard.push_device_count,
      icon: BellRing,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Attendees
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Read-only directory. Search identity and notification reachability. This
        workspace cannot edit attendee accounts.
      </Typography>

      <MetricCards metrics={metrics} className="mt-6" />

      <div className="mt-8">
        <AttendeeDirectory initialAttendees={attendees} initialQuery={q} />
      </div>
    </div>
  );
}
