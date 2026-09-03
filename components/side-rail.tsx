"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Badge, Separator, Typography } from "@heroui/react";
import {
  Bell,
  House,
  MoreHorizontal,
  QrCode,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { useAlertsCount } from "@/components/alerts-count-provider";

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
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    active
      ? "bg-default text-foreground font-semibold"
      : "text-muted hover:bg-default hover:text-foreground"
  }`;
}

export function SideRail({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { unreadCount } = useAlertsCount();

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover"
        />
        <Typography type="h5" weight="semibold">
          Sync
        </Typography>
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
        {isAdmin ? (
          <Link href="/admin" className={railLinkClass(false)}>
            <ShieldCheck className="size-5" aria-hidden />
            Admin view
          </Link>
        ) : null}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={railLinkClass(pathname.startsWith("/settings"))}
        >
          <User className="size-5" aria-hidden />
          Account
        </Link>
        <SignOutButton variant="labeled" />
      </div>
    </aside>
  );
}
