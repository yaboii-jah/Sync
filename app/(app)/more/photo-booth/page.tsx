import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { PhotoBoothClient } from "@/components/photo-booth/photo-booth-client";
import { HistoryBackButton } from "@/components/history-back-button";
import { isMultiTenantPlatformEnabled } from "@/lib/feature-flags";
import { legacyPhotoBoothDestination } from "@/lib/events/routing";
import { getUserEvents } from "@/lib/supabase/queries/events";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Photo Booth - Sync",
};

export default async function PhotoBoothPage() {
  const { user } = await requireCompleteProfile();
  if (isMultiTenantPlatformEnabled()) {
    const supabase = await createClient();
    redirect(legacyPhotoBoothDestination(await getUserEvents(supabase, user.id)));
  }

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-6 lg:max-w-xl lg:px-10 lg:pt-10">
        <AppHeader />
        <div className="mt-6">
          <HistoryBackButton fallback="/more" />
        </div>
        <PageHeader
          title="Photo Booth"
          description="Make a three-shot keepsake for your story."
        />
        <div className="mt-6">
          <PhotoBoothClient />
        </div>
      </div>
    </main>
  );
}
