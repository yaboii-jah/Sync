import type { Metadata } from "next";
import { headers } from "next/headers";
import { Alert } from "@heroui/react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { ConnectClient } from "@/components/connect/connect-client";
import { getOwnNetworkingCard } from "@/lib/supabase/queries/networking";

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
  await requireCompleteProfile();

  /*
   * Read through the card RPC rather than selecting `social_profiles`
   * directly, so one query answers what is saved for the stable card.
   */
  const card = await getOwnNetworkingCard();
  if (!card) throw new Error("Networking card recovery failed");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredOrigin && !host) {
    throw new Error("Could not determine the networking card origin");
  }
  const origin = configuredOrigin ?? `${protocol}://${host}`;
  const cardUrl = new URL(`/c/${card.publicToken}`, origin).toString();
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
            cardUrl={cardUrl}
            initialLinks={card.links}
          />
        </div>
      </div>
    </main>
  );
}
