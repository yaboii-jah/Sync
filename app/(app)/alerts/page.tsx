import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/supabase/queries/notifications";
import { AlertsClient } from "@/components/alerts/alerts-client";

export default async function AlertsPage() {
  await requireCompleteProfile();

  const supabase = await createClient();
  const notifications = await getNotifications(supabase);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-2xl lg:px-10 lg:pt-10">
        <h1 className="font-display text-3xl text-text-primary uppercase">
          Alerts
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Automatic session updates — live the moment they happen.
        </p>
        <AlertsClient initialNotifications={notifications} />
      </div>
    </main>
  );
}
