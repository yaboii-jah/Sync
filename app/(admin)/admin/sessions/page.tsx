import { Typography } from "@heroui/react";
import { createClient } from "@/lib/supabase/server";
import { getSessionsWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { AdminSessionsClient } from "@/components/admin/admin-sessions-client";

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const sessions = await getSessionsWithSpeakers(supabase);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <Typography.Heading level={1} className="text-2xl">
        Live session state
      </Typography.Heading>
      <Typography type="body-sm" color="muted" className="mt-2 max-w-2xl">
        Manual Start or End remains authoritative until Resume Auto. Published
        schedule times are not changed.
      </Typography>
      <AdminSessionsClient sessions={sessions} />
    </div>
  );
}
