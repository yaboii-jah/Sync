"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Separator, Typography } from "@/components/ui";
import {
  Bell,
  House,
  MoreHorizontal,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { useAlertsCount } from "@/components/alerts-count-provider";
import { ProfileMenu } from "@/components/profile-menu";

interface RailItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

const RAIL_ITEMS: RailItem[] = [
  { label: "Home", icon: House, href: "/home" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Connect", icon: QrCode, href: "/connect" },
  { label: "More", icon: MoreHorizontal, href: "/more" },
];

function railLinkClass(active: boolean) {
  return `flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-3 pl-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none ${
    active
      ? "border-accent text-accent font-semibold"
      : "border-transparent text-muted hover:text-foreground"
  }`;
}

export function SideRail({
  isAdmin = false,
  profile,
}: {
  isAdmin?: boolean;
  profile?: { name: string | null; photo_url: string | null } | null;
}) {
  const pathname = usePathname();
  const { unreadCount } = useAlertsCount();

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r lg:flex">
      <div className="px-6 py-6">
        <Link
          href="/home"
          className="inline-flex rounded-lg focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          <Typography type="h5" weight="semibold" className="identity-font">
            Sync
          </Typography>
        </Link>
      </div>

      <Separator />

      <nav aria-label="Primary" className="flex flex-col gap-1 px-3 py-4">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          const showBadge = item.label === "Alerts" && unreadCount > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={railLinkClass(active)}
            >
              <Badge.Anchor>
                <Icon className="size-5" aria-hidden />
                {showBadge ? (
                  <Badge size="sm">{unreadCount > 9 ? "9+" : unreadCount}</Badge>
                ) : null}
              </Badge.Anchor>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-3 pb-6">
        <Separator className="mb-3" />
        <ProfileMenu
          name={profile?.name}
          photoUrl={profile?.photo_url}
          isAdmin={isAdmin}
          showName
          placement="right bottom"
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm text-muted outline-none transition hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        />
      </div>
    </aside>
  );
}
