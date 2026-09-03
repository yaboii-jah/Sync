"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Typography } from "@heroui/react";
import {
  Bell,
  House,
  MoreHorizontal,
  QrCode,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAlertsCount } from "@/components/alerts-count-provider";
import { ThemeSwitch } from "@/components/theme-switch";
import { ResponsiveSignOutButton } from "@/components/responsive-sign-out-button";

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

function topNavLinkClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
    active
      ? "text-foreground font-semibold"
      : "text-muted hover:text-foreground"
  }`;
}

export function SideRail({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { unreadCount } = useAlertsCount();

  return (
    <header className="relative z-40 isolate hidden min-h-24 shrink-0 w-full items-center gap-8 bg-linear-to-b from-surface to-transparent px-8 lg:absolute lg:inset-x-0 lg:top-0 lg:flex">
      <Link
        href="/home"
        className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Typography type="h5" weight="semibold">
          Sync
        </Typography>
      </Link>

      <nav aria-label="Primary" className="flex items-center gap-1">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          const showBadge = item.label === "Alerts" && unreadCount > 0;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={topNavLinkClass(active)}
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

      <div className="ml-auto flex items-center gap-1">
        {isAdmin ? (
          <Link href="/admin" className={topNavLinkClass(false)}>
            <ShieldCheck className="size-5" aria-hidden />
            Admin view
          </Link>
        ) : null}
        <ThemeSwitch />
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={topNavLinkClass(pathname.startsWith("/settings"))}
        >
          <User className="size-5" aria-hidden />
          Account
        </Link>
        <ResponsiveSignOutButton showOn="desktop" />
      </div>
    </header>
  );
}
