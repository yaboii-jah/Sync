import type { Metadata } from "next";
import { headers } from "next/headers";
import { Alert } from "@heroui/react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { ConnectCard } from "@/components/connect/connect-card";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

const SHARED_MESSAGES: Record<string, { status: "success" | "danger"; text: string }> = {
  ok: {
    status: "success",
    text: "Saved. Your LinkedIn profile is on your card.",
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
  // Set by /share when an attendee shares their profile in from LinkedIn.
  // Without it the save is silent, which reads as the share having failed.
  const { shared } = await searchParams;
  const { profile } = await requireCompleteProfile();
  const card = await getOwnNetworkingCard();
  const name = profile.name || "Attendee";

  /*
   * The QR must carry an absolute URL — a scanner's camera has no origin to
   * resolve a relative path against. `origin` is preferred over the env var so
   * a preview deployment produces a code that points at itself rather than at
   * production.
   */
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${headerList.get("host") ?? ""}`;

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
          {card ? (
            <ConnectCard
              name={name}
              photoUrl={profile.photo_url}
              qrValue={`${origin}/c/${card.publicToken}`}
              links={card.links}
              isPublic={card.isPublic}
            />
          ) : (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  Your networking card could not be loaded. Reload the page, and
                  tell an organiser if it stays missing.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </div>
      </div>
    </main>
  );
}
