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
  solid: { className: "network-card--solid", showCrystal: true, showStars: false, showMoon: false, showEventBranding: false },
  glass: { className: "network-card--glass", showCrystal: true, showStars: true, showMoon: false, showEventBranding: false },
  crystal: { className: "network-card--crystal", showCrystal: true, showStars: true, showMoon: false, showEventBranding: false },
  event: { className: "network-card--event", showCrystal: true, showStars: true, showMoon: true, showEventBranding: false },
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

export function NetworkCard({ variant = "solid", name, photoUrl, links, bio, organization, badge }: NetworkCardProps) {
  const normalized: NetworkCardVariant =
    typeof variant === "number" ? getVariantFromTemplate(variant) : variant;
  const theme = networkCardThemes[normalized];
  const networks = SOCIAL_NETWORKS.filter((n) => links[n]);

  return (
    <article className={`network-card ${theme.className}`}>
      <div className="network-card__decoration" aria-hidden="true">
        {theme.showCrystal && (
          <svg className="network-card__crystal" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M60 6 L95 30 L95 78 L60 102 L25 78 L25 30 Z"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <path d="M25 30 L60 52 L95 30" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <path d="M60 52 L60 102" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path d="M25 78 L60 52 L95 78" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path d="M42 22 L60 6 L78 22" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
          </svg>
        )}
        {theme.showStars && (
          <div className="network-card__stars">
            <span className="network-card__star" style={{ top: "14%", left: "18%" }} />
            <span className="network-card__star" style={{ top: "22%", right: "16%" }} />
            <span className="network-card__star" style={{ top: "42%", right: "28%" }} />
            <span className="network-card__star" style={{ top: "68%", left: "12%" }} />
            <span className="network-card__star network-card__star--lg" style={{ top: "10%", right: "22%" }} />
          </div>
        )}
        {theme.showMoon && <span className="network-card__moon" />}
        {theme.showEventBranding && (
          <div className="network-card__event-mark">
            <span className="network-card__event-label">STUDENT COMMUNITY DAY</span>
            <span className="network-card__event-subtitle">MEGA MANILA 2026</span>
          </div>
        )}
        {normalized === "glass" && (
          <img
            src="/assets/scd%20pubmats%20(4).svg"
            alt=""
            aria-hidden="true"
            className="network-card__pubmat"
            loading="lazy"
          />
        )}
        {normalized === "crystal" && (
          <img
            src="/assets/scd%20pubmats%20(3).svg"
            alt=""
            aria-hidden="true"
            className="network-card__pubmat"
            loading="lazy"
          />
        )}
        {normalized === "event" && (
          <img
            src="/assets/scd%20pubmats%20clena.svg"
            alt=""
            aria-hidden="true"
            className="network-card__pubmat"
            loading="lazy"
          />
        )}
      </div>

      <div className="network-card__content">
        <div className="network-card__header">
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
            <p className="network-card__event-inline">BUILD · FORGE · REPEAT</p>
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
