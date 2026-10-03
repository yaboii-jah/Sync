import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Card, Typography } from "@/components/ui/static";
import { UserX } from "lucide-react";

import { AppNavigationShell } from "@/components/app-navigation-shell";
import { BackToMyQrButton } from "@/components/connect/back-to-my-qr-button";
import { EmptyState } from "@/components/empty-states";
import { NetworkCard } from "@/components/network-card";
import { SOCIAL_NETWORKS } from "@/lib/social";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";
import {
  getOwnNetworkingCard,
  getPublicNetworkingCard,
  type PublicNetworkingCard,
} from "@/lib/supabase/queries/networking";
import {
  isMissingNetworkingScanHistoryRpc,
  recordNetworkingCardScan,
} from "@/lib/supabase/queries/scan-history";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";

export const metadata: Metadata = {
  title: "Networking Card — Sync",
  description: "An attendee networking card.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CardPage(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const searchParams = await props.searchParams;
  const authenticated = await getAuthenticatedProfile();
  const isAdmin = authenticated ? await currentUserIsAdmin() : false;
  const ownerPreview =
    searchParams.preview === "1"
      ? await getOwnerPreview(token, authenticated)
      : null;
  const resolvedCard = ownerPreview ?? (await getPublicNetworkingCard(token));
  if (resolvedCard && !ownerPreview) {
    try {
      await recordNetworkingCardScan(token);
    } catch (error) {
      // A scan-history migration rollout must not prevent a public card from
      // opening. Other recording failures remain visible in server logs.
      if (!isMissingNetworkingScanHistoryRpc(error)) {
        console.error("Could not record networking card scan", error);
      }
    }
  }
  const variant =
    resolvedCard?.template === 2
      ? "glass"
      : resolvedCard?.template === 3
        ? "crystal"
        : resolvedCard?.template === 4
          ? "event"
          : "solid";
  const returnControl = authenticated?.profile ? (
    <div className="mb-4">
      <BackToMyQrButton
        label={ownerPreview ? "Back to Connect" : "Back to my QR"}
      />
    </div>
  ) : null;

  function withAuthenticatedNavigation(content: ReactNode) {
    if (!authenticated?.profile) return content;

    return (
      <AppNavigationShell isAdmin={isAdmin} profile={authenticated.profile}>
        {content}
      </AppNavigationShell>
    );
  }

  return withAuthenticatedNavigation(
    <main className={`c-page c-page--${variant}`}>
      <div className="c-page__inner">
        {resolvedCard ? (
          <>
            {returnControl}
            <Typography type="body-sm" color="muted">You met</Typography>
            <div className="mt-2">
              <NetworkCard
                variant={resolvedCard.template}
                name={resolvedCard.name}
                photoUrl={resolvedCard.photoUrl}
                links={resolvedCard.links}
              />
            </div>
          </>
        ) : (
          <Card>
            <EmptyState
              icon={<UserX />}
              title="Card unavailable"
              description="This networking card is unavailable or has no active profiles."
            />
          </Card>
        )}
      </div>
    </main>
  );
}

async function getOwnerPreview(
  token: string,
  authenticated: Awaited<ReturnType<typeof getAuthenticatedProfile>>,
): Promise<PublicNetworkingCard | null> {
  if (!authenticated?.profile) return null;

  const ownCard = await getOwnNetworkingCard();
  if (!ownCard || ownCard.publicToken !== token) return null;

  const hasLinks = SOCIAL_NETWORKS.some((network) => ownCard.links[network]);
  if (!hasLinks) return null;

  return {
    name: authenticated.profile.name,
    photoUrl: authenticated.profile.photo_url,
    links: ownCard.links,
    template: ownCard.template,
  };
}
