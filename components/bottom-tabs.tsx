"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  Bell,
  House,
  MoreHorizontal,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { useAlertsCount } from "@/components/alerts-count-provider";

interface TabConfig {
  label: string;
  icon: LucideIcon;
  href: string;
}

const TABS: TabConfig[] = [
  { label: "Home", icon: House, href: "/home" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Connect", icon: QrCode, href: "/connect" },
  { label: "More", icon: MoreHorizontal, href: "/more" },
];

export function BottomTabs() {
  const pathname = usePathname();
  const { unreadCount } = useAlertsCount();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname.startsWith(tab.href);
          const showBadge = tab.label === "Alerts" && unreadCount > 0;

          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-95 motion-reduce:transform-none ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Badge.Anchor>
                <Icon className="size-5" aria-hidden />
                {showBadge ? (
                  <Badge size="sm">{unreadCount > 9 ? "9+" : unreadCount}</Badge>
                ) : null}
              </Badge.Anchor>
              <span
                className={`text-xs ${active ? "font-semibold" : "font-normal"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
