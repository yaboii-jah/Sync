import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Avatar, Card, Typography } from "@heroui/react";
import { ExternalLink, UserX } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { EmptyState } from "@/components/empty-states";
import { getPublicNetworkingCard } from "@/lib/supabase/queries/networking";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { SOCIAL_NETWORKS, SOCIAL_SPECS } from "@/lib/social";
import {
  primaryLinkClass,
  secondaryLinkClass,
} from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Connection — Sync",
};

/**
 * Where a scanned networking QR lands.
 *
 * The QR encodes a card token rather than an attendee id, so the card its owner
 * publishes is the only thing this route can show: the RPC returns rows only
 * while the card is public, and it returns the links the owner chose — never
 * their id, their token, or a profile they did not publish. Withdrawing the
 * card takes effect on the next scan of the same code.
 *
 * Sign-in is still required, so the reader is a fellow attendee rather than
 * anyone who happens to point a camera at a photo of the code.
 */
export default async function CardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // Gates on sign-in and gives the scanner their own nav shell.
  await requireCompleteProfile();

  const { token } = await params;
  const card = await getPublicNetworkingCard(token);
  const links = card
    ? SOCIAL_NETWORKS.filter((network) => card.links[network])
    : [];

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 pb-8 lg:pt-10">
        <AppHeader />

        {card ? (
          <>
            <Typography type="body-sm" color="muted" className="mt-6">
              You met
            </Typography>

            <Card className="mt-2">
              <Card.Content className="flex flex-col items-center gap-4 py-8 text-center">
                <Avatar size="lg" className="size-24">
                  {card.photoUrl ? (
                    <Avatar.Image asChild src={card.photoUrl}>
                      <Image
                        src={card.photoUrl}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                      />
                    </Avatar.Image>
                  ) : null}
                  <Avatar.Fallback>
                    {(card.name || "?").charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                </Avatar>

                <Typography.Heading level={1} className="text-xl">
                  {card.name || "Attendee"}
                </Typography.Heading>
              </Card.Content>

              <Card.Footer className="flex flex-col gap-3">
                {links.map((network, index) => (
                  <a
                    key={network}
                    href={card.links[network]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${index === 0 ? primaryLinkClass : secondaryLinkClass} w-full`}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Connect on {SOCIAL_SPECS[network].label}
                  </a>
                ))}
              </Card.Footer>
            </Card>
          </>
        ) : (
          <Card className="mt-6">
            <EmptyState
              icon={<UserX />}
              title="Card not found"
              description="That code is not sharing a card right now. Ask them to open Connect and show it again."
            />
          </Card>
        )}

        <div className="mt-6">
          <Link href="/home" className={`${secondaryLinkClass} w-full`}>
            Back to Sync
          </Link>
        </div>
      </div>
    </main>
  );
}
