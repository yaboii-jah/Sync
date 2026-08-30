import { createClient } from "@/lib/supabase/server";
import { getSessionsWithSpeakers } from "@/lib/supabase/queries/program-flow";
import { AdminSessionsClient } from "@/components/admin/admin-sessions-client";

export default async function AdminSessionsPage() {
  const supabase = await createClient();
  const sessions = await getSessionsWithSpeakers(supabase);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-10 lg:py-10">
      <p className="text-xs font-bold tracking-[0.24em] text-pastel-yellow uppercase">Program control</p>
      <h1 className="mt-2 font-display text-4xl text-text-primary uppercase">Live session state</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
        Manual Start or End remains authoritative until Resume Auto. Published schedule times are not changed.
      </p>
      <AdminSessionsClient sessions={sessions} />
    </div>
  );
}
