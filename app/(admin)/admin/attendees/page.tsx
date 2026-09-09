import { Typography } from "@/components/ui/static";
import { createClient } from "@/lib/supabase/server";
import { searchAdminAttendees } from "@/lib/supabase/queries/admin";
import { AttendeeDirectory } from "@/components/admin/attendee-directory";
import { RaffleExport } from "@/components/admin/raffle-export";

export default async function AdminAttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const q = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const supabase = await createClient();
  const attendees = await searchAdminAttendees(supabase, q, 50);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Typography.Heading level={1} className="text-2xl">
          Attendees
        </Typography.Heading>
        <RaffleExport />
      </div>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Read-only directory. Search identity and notification reachability. This
        workspace cannot edit attendee accounts.
      </Typography>

      <div className="mt-8"><AttendeeDirectory initialAttendees={attendees} initialQuery={q} /></div>
    </div>
  );
}
