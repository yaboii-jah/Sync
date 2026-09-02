import type { Metadata } from "next";
import { Alert } from "@heroui/react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { ConnectClient } from "@/components/connect/connect-client";
import type { SocialPlatform } from "@/lib/platforms";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

const SHARED_MESSAGES: Record<string, { status: "success" | "danger"; text: string }> = {
  ok: {
    status: "success",
    text: "Saved. Your code now opens your profile directly.",
  },
  miss: {
    status: "danger",
    text: "That did not look like a profile link. Open your profile, then Share it to Sync.",
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

  const supabase = await createClient();
  const { data: socialProfiles } = await supabase
    .from("social_profiles")
    .select("network, url")
    .eq("user_id", profile.id);

  const savedUrls: Partial<Record<SocialPlatform, string>> = {};
  if (socialProfiles) {
    for (const sp of socialProfiles) {
      savedUrls[sp.network as SocialPlatform] = sp.url;
    }
  }

  const sharedMessage = shared
    ? (SHARED_MESSAGES[shared] ?? {
        status: "danger" as const,
        text: "Could not save that link. Try again, or set it in Settings.",
      })
    : null;

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
          <ConnectClient
            name={name}
            photoUrl={profile.photo_url}
            savedUrls={savedUrls}
          />
        </div>
      </div>
    </main>
  );
}
