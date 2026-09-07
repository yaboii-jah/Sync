import type { Metadata } from "next";
import { Card } from "@/components/ui/static";
import { AppHeader } from "@/components/app-header";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { HistoryBackButton } from "@/components/history-back-button";
import { PageHeader } from "@/components/page-header";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const metadata: Metadata = {
  title: "Feedback — Sync",
};

export default async function FeedbackPage() {
  await requireCompleteProfile();

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-8 lg:pt-10">
        <AppHeader />
        <div className="mt-6">
          <HistoryBackButton fallback="/more" />
        </div>
        <PageHeader
          title="Feedback"
          description="Help us make the Sync experience better for everyone."
        />

        <Card className="mt-6">
          <FeedbackForm initialRequestId={crypto.randomUUID()} />
        </Card>
      </div>
    </main>
  );
}
