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

function isInternalQuickLink(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

export function QuickLinksClient({
  quickLinks,
}: {
  quickLinks: QuickLink[];
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {quickLinks.map((link) => {
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
            <Link key={link.id} href={link.url} className="block rounded-xl">
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
            className="block rounded-xl"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
