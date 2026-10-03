"use client";

import Image from "next/image";
import { Avatar } from "@/components/ui/static";
import { SocialIcon } from "@/components/social-icon";
import { SOCIAL_NETWORKS, SOCIAL_SPECS } from "@/lib/social";
import { secondaryLinkClass } from "@/components/ui/link-button";
import type { SocialLinks } from "@/lib/social";
import type { NetworkCardTemplate } from "@/lib/supabase/queries/networking";

export type NetworkCardVariant = "solid" | "glass" | "crystal" | "event";

const templateToVariant: Record<NetworkCardTemplate, NetworkCardVariant> = {
  1: "solid",
  2: "glass",
  3: "crystal",
  4: "event",
};

const variantToTemplate: Record<NetworkCardVariant, NetworkCardTemplate> = {
  solid: 1,
  glass: 2,
  crystal: 3,
  event: 4,
};

export function getVariantFromTemplate(t: NetworkCardTemplate): NetworkCardVariant {
  return templateToVariant[t] ?? "solid";
}

export function getTemplateFromVariant(v: NetworkCardVariant): NetworkCardTemplate {
  return variantToTemplate[v];
}

export const networkCardThemes: Record<
  NetworkCardVariant,
  { className: string; showCrystal: boolean; showStars: boolean; showMoon: boolean; showEventBranding: boolean }
> = {
  solid: { className: "network-card--solid", showCrystal: false, showStars: false, showMoon: false, showEventBranding: false },
  glass: { className: "network-card--glass", showCrystal: false, showStars: false, showMoon: false, showEventBranding: false },
  crystal: { className: "network-card--crystal", showCrystal: false, showStars: false, showMoon: false, showEventBranding: false },
  event: { className: "network-card--event", showCrystal: false, showStars: false, showMoon: false, showEventBranding: false },
};

interface NetworkCardProps {
  variant?: NetworkCardVariant | NetworkCardTemplate;
  name: string;
  photoUrl?: string | null;
  links: SocialLinks;
  bio?: string;
  organization?: string;
  badge?: string;
}

export function NetworkCard({ variant = "solid", name, photoUrl, links, organization, badge }: NetworkCardProps) {
  const normalized: NetworkCardVariant =
    typeof variant === "number" ? getVariantFromTemplate(variant) : variant;
  const theme = networkCardThemes[normalized];
  const networks = SOCIAL_NETWORKS.filter((n) => links[n]);

  return (
    <article className={`network-card ${theme.className}`}>
      <div className="network-card__decoration" aria-hidden="true" />

      <div className="network-card__content">
        <div className="network-card__header">
          {normalized === "event" ? <Image src="/icons/mascot-96.png" alt="" width={48} height={48} className="network-card__event-logo" /> : null}
          <Avatar size="lg" className="network-card__avatar size-24">
            {photoUrl ? (
              <Avatar.Image asChild src={photoUrl}>
                <Image src={photoUrl} alt="" width={96} height={96} unoptimized />
              </Avatar.Image>
            ) : null}
            <Avatar.Fallback>{(name || "?").charAt(0).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="network-card__identity">
            <h1 className="network-card__name">{name || "Attendee"}</h1>
            {organization ? <p className="network-card__organization">{organization}</p> : null}
            {badge ? <span className="network-card__badge">{badge}</span> : null}
            <p className="network-card__event-inline">AWS Student Community Day South Summity 2026</p>
          </div>
        </div>

        <hr className="network-card__divider" />

        <div className="network-card__actions">
          {networks.length > 0 ? (
            networks.map((network) => (
              <a
                key={network}
                href={links[network]}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryLinkClass} network-card__social-button`}
              >
                <span className="network-card__social-inner">
                  <SocialIcon network={network} />
                  <span>Connect on {SOCIAL_SPECS[network].label}</span>
                </span>
              </a>
            ))
          ) : (
            <span className="network-card__empty">No active profiles</span>
          )}
        </div>


      </div>
    </article>
  );
}
