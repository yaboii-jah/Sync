"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, MoreHorizontal, QrCode, type LucideIcon } from "lucide-react";
import { useAlertsCount } from "@/components/alerts-count-provider";

interface TabConfig {
  label: string;
  icon: LucideIcon;
  href?: string;
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-base lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href != null && pathname.startsWith(tab.href);
          const showBadge = tab.label === "Alerts" && unreadCount > 0;

          if (!tab.href) {
            return (
              <span
                key={tab.label}
                aria-disabled
                className="flex flex-1 flex-col items-center gap-1 py-1 text-text-muted opacity-40"
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {showBadge ? (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-error px-1 text-[0.6rem] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="text-[0.62rem] font-bold tracking-wide uppercase">
                  {tab.label}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${
                active
                  ? "text-state-success [text-shadow:0_0_10px_rgba(88,222,105,0.6)]"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {showBadge ? (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-error px-1 text-[0.6rem] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="text-[0.62rem] font-bold tracking-wide uppercase">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
