import type { Metadata } from "next";
import Image from "next/image";
import { Avatar, Card, Typography } from "@/components/ui/static";
import { UserX } from "lucide-react";

import { EmptyState } from "@/components/empty-states";
import { HistoryBackButton } from "@/components/history-back-button";
import { SocialIcon } from "@/components/social-icon";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_NETWORKS, SOCIAL_SPECS } from "@/lib/social";
import {
  getOwnNetworkingCard,
  getPublicNetworkingCard,
  type PublicNetworkingCard,
} from "@/lib/supabase/queries/networking";
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
  const ownerPreview =
    searchParams.preview === "1"
      ? await getOwnerPreview(token)
      : null;
  const resolvedCard = ownerPreview ?? (await getPublicNetworkingCard(token));
  const links = resolvedCard
    ? SOCIAL_NETWORKS.filter((network) => resolvedCard.links[network])
    : [];

  return (
    <main className="flex min-h-full w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {resolvedCard ? (
          <>
            {ownerPreview ? (
              <div className="mb-4">
                <HistoryBackButton fallback="/connect" label="Back to Connect" />
              </div>
            ) : null}
            <Typography type="body-sm" color="muted">
              You met
            </Typography>

            <Card className="mt-2">
              <Card.Content className="flex flex-col items-center gap-4 py-8 text-center">
                <Avatar size="lg" className="size-24">
                  {resolvedCard.photoUrl ? (
                    <Avatar.Image asChild src={resolvedCard.photoUrl}>
                      <Image
                        src={resolvedCard.photoUrl}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                      />
                    </Avatar.Image>
                  ) : null}
                  <Avatar.Fallback>
                    {(resolvedCard.name || "?").charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar>

                <Typography.Heading level={1} className="font-display text-2xl tracking-wide">
                  {resolvedCard.name || "Attendee"}
                </Typography.Heading>
                <Typography type="body-sm" color="muted">
                  Choose where you would like to connect.
                </Typography>
              </Card.Content>

              <Card.Footer className="!grid grid-cols-1 gap-3 sm:grid-cols-2">
                {links.map((network) => (
                  <a
                    key={network}
                    href={resolvedCard.links[network]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${secondaryLinkClass} h-full min-w-0 w-full px-3 py-3`}
                  >
                    <span className="mx-auto grid w-full max-w-[15rem] grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-2 text-left leading-5">
                      <SocialIcon network={network} />
                      <span>Connect on {SOCIAL_SPECS[network].label}</span>
                    </span>
                  </a>
                ))}
              </Card.Footer>
            </Card>
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

async function getOwnerPreview(token: string): Promise<PublicNetworkingCard | null> {
  const authenticated = await getAuthenticatedProfile();
  if (!authenticated?.profile) return null;

  const ownCard = await getOwnNetworkingCard();
  if (!ownCard || ownCard.publicToken !== token) return null;

  const hasLinks = SOCIAL_NETWORKS.some((network) => ownCard.links[network]);
  if (!hasLinks) return null;

  return {
    name: authenticated.profile.name,
    photoUrl: authenticated.profile.photo_url,
    links: ownCard.links,
  };
}
