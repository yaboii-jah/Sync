"use client";

import Link from "next/link";
import { Camera, Globe, MessageSquare, type LucideIcon } from "lucide-react";
import { Card, Typography } from "@/components/ui";
import type { QuickLink } from "@/lib/supabase/queries/quick-links";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  camera: Camera,
  "message-square": MessageSquare,
};

const PHOTO_BOOTH_LINK: QuickLink = {
  id: "app-photo-booth",
  label: "Photo Booth",
  url: "/more/photo-booth",
  icon: "camera",
};

const EVENT_WEBSITE_LINK: QuickLink = {
  id: "app-event-website",
  label: "Event Website",
  url: "https://aws.scd-south.cloud/",
  icon: "globe",
};

const linkClassName =
  "block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function isInternalQuickLink(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

export function QuickLinksClient({
  quickLinks,
}: {
  quickLinks: QuickLink[];
}) {
  const links = [
    PHOTO_BOOTH_LINK,
    EVENT_WEBSITE_LINK,
    ...quickLinks.filter(
      (link) =>
        link.url !== PHOTO_BOOTH_LINK.url &&
        link.url.replace(/\/$/, "") !== EVENT_WEBSITE_LINK.url.replace(/\/$/, ""),
    ),
  ];

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {links.map((link) => {
        const Icon = (link.icon && ICONS[link.icon]) || Globe;
        const content = (
          <Card className="hover:bg-default h-full transition-colors">
            <Card.Content className="flex items-center gap-3 py-4">
              <span
                aria-hidden
                className="bg-surface-secondary flex size-10 shrink-0 items-center justify-center rounded-full"
              >
                <Icon className="size-5" />
              </span>
              <Typography type="body-sm" weight="medium">
                {link.label}
              </Typography>
            </Card.Content>
          </Card>
        );

        if (isInternalQuickLink(link.url)) {
          return (
            <Link key={link.id} href={link.url} className={linkClassName}>
              {content}
            </Link>
          );
        }

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
