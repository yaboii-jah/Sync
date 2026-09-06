import type { Metadata } from "next";
import { Card, Typography } from "@/components/ui/static";
import { UserX } from "lucide-react";

import { EmptyState } from "@/components/empty-states";
import { HistoryBackButton } from "@/components/history-back-button";
import { NetworkCard } from "@/components/network-card";
import { SOCIAL_NETWORKS } from "@/lib/social";
import type { NetworkCardTemplate } from "@/lib/supabase/queries/networking";
import {
  getOwnNetworkingCard,
  getPublicNetworkingCard,
  type PublicNetworkingCard,
} from "@/lib/supabase/queries/networking";
import { recordNetworkingCardScan } from "@/lib/supabase/queries/scan-history";
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
  if (resolvedCard && !ownerPreview) {
    try {
      await recordNetworkingCardScan(token);
    } catch (error) {
      // An unavailable scan-history write must not prevent the public card
      // from opening; the migration and function are deployed together.
      console.error("Could not record networking card scan", error);
    }
  }
  const links = resolvedCard
    ? SOCIAL_NETWORKS.filter((network) => resolvedCard.links[network])
    : [];

  const variant =
    resolvedCard?.template === 2
      ? "glass"
      : resolvedCard?.template === 3
        ? "crystal"
        : resolvedCard?.template === 4
          ? "event"
          : "solid";

  if (variant === "glass" && resolvedCard) {
    return (
      <main className="c-page c-page--glass">
        <div className="c-page__bg" aria-hidden="true">
          <span className="c-page__glow c-page__glow--glass-a" />
          <span className="c-page__glow c-page__glow--glass-b" />
          <span className="c-page__star" style={{ top: "10%", left: "16%" }} />
          <span className="c-page__star" style={{ top: "20%", right: "14%" }} />
          <span className="c-page__star" style={{ top: "74%", left: "12%" }} />
          <img src="/assets/scd%20pubmats%20(4).svg" alt="" aria-hidden="true" className="c-page__pubmat" loading="lazy" />
        </div>
        <div className="c-page__inner">
          {ownerPreview ? (
            <div className="mb-4">
              <HistoryBackButton fallback="/connect" label="Back to Connect" />
            </div>
          ) : null}
          <p className="c-page__eyebrow c-page__eyebrow--glass">You met</p>
          <div className="mt-3">
            <NetworkCard
              variant={resolvedCard.template}
              name={resolvedCard.name}
              photoUrl={resolvedCard.photoUrl}
              links={resolvedCard.links}
            />
          </div>
          <p className="c-page__footnote c-page__footnote--glass">Atmospheric · glass edition</p>
        </div>
      </main>
    );
  }

  if (variant === "crystal" && resolvedCard) {
    return (
      <main className="c-page c-page--crystal">
        <div className="c-page__bg" aria-hidden="true">
          <svg className="c-page__crystal" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 6 L95 30 L95 78 L60 102 L25 78 L25 30 Z" stroke="currentColor" strokeWidth="0.7" opacity="0.9" />
            <path d="M25 30 L60 52 L95 30" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
            <path d="M60 52 L60 102" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <path d="M25 78 L60 52 L95 78" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
          </svg>
          <span className="c-page__star" style={{ top: "8%", left: "14%" }} />
          <span className="c-page__star" style={{ top: "18%", right: "12%" }} />
          <span className="c-page__star" style={{ top: "72%", left: "10%" }} />
          <span className="c-page__star" style={{ top: "64%", right: "18%" }} />
          <span className="c-page__star c-page__star--lg" style={{ top: "12%", left: "42%" }} />
          <img src="/assets/scd%20pubmats%20(3).svg" alt="" aria-hidden="true" className="c-page__pubmat" loading="lazy" />
        </div>
        <div className="c-page__inner">
          {ownerPreview ? (
            <div className="mb-4">
              <HistoryBackButton fallback="/connect" label="Back to Connect" />
            </div>
          ) : null}
          <p className="c-page__eyebrow">You met</p>
          <div className="mt-3">
            <NetworkCard
              variant={resolvedCard.template}
              name={resolvedCard.name}
              photoUrl={resolvedCard.photoUrl}
              links={resolvedCard.links}
            />
          </div>
          <p className="c-page__footnote">Dark outline · crystal edition</p>
        </div>
      </main>
    );
  }

  if (variant === "event" && resolvedCard) {
    return (
      <main className="c-page c-page--event">
        <div className="c-page__bg" aria-hidden="true">
          <span className="c-page__glow c-page__glow--gold" />
          <span className="c-page__glow c-page__glow--aqua" />
          <span className="c-page__star" style={{ top: "10%", left: "18%" }} />
          <span className="c-page__star" style={{ top: "16%", right: "16%" }} />
          <span className="c-page__star" style={{ top: "70%", left: "12%" }} />
          <span className="c-page__star c-page__star--lg" style={{ top: "8%", right: "22%" }} />
          <img src="/assets/scd%20pubmats%20clena.svg" alt="" aria-hidden="true" className="c-page__pubmat" loading="lazy" />
        </div>
        <div className="c-page__inner">
          {ownerPreview ? (
            <div className="mb-4">
              <HistoryBackButton fallback="/connect" label="Back to Connect" />
            </div>
          ) : null}
          <p className="c-page__eyebrow c-page__eyebrow--event">You met</p>
          <div className="mt-3">
            <NetworkCard
              variant={resolvedCard.template}
              name={resolvedCard.name}
              photoUrl={resolvedCard.photoUrl}
              links={resolvedCard.links}
            />
          </div>
          <p className="c-page__footnote c-page__footnote--event">Featured · event edition — BUILD · FORGE · REPEAT</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`c-page c-page--${variant} flex min-h-full w-full items-center justify-center px-4 py-10`}>
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
    template: ownCard.template,
  };
}
