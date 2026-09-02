import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { SocialConnectCard } from "@/components/connect/connect-card";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

const SHARED_MESSAGES: Record<string, { status: "success" | "danger"; text: string }> = {
  ok: {
    status: "success",
    text: "Saved. Your code now opens your LinkedIn profile directly.",
  },
  miss: {
    status: "danger",
    text: "That did not look like a LinkedIn profile link. Open your profile in LinkedIn, then Share it to Sync.",
  },
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ shared?: string }>;
}) {
  const { shared } = await searchParams;
  const { profile } = await requireCompleteProfile();
  const name = profile.name || "Attendee";

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <AppHeader />
        <PageHeader
          title="Connect"
          description="Show your code, make a connection."
        />

        {sharedMessage ? (
          <Alert status={sharedMessage.status} className="mt-4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{sharedMessage.text}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="mt-6">
          <SocialConnectCard name={name} photoUrl={profile.photo_url} />
        </div>
      </div>
    </main>
  );
}
