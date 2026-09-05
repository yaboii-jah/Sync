import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { PhotoBoothClient } from "@/components/photo-booth/photo-booth-client";

export const metadata: Metadata = {
  title: "Photo Booth - Sync",
};

export default async function PhotoBoothPage() {
  await requireCompleteProfile();

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-6 lg:max-w-xl lg:px-10 lg:pt-10">
        <AppHeader />
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
