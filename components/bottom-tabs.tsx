"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, House, MoreHorizontal, QrCode, type LucideIcon } from "lucide-react";

interface TabConfig {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const TABS: TabConfig[] = [
  { label: "Home", icon: House, href: "/home" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Connect", icon: QrCode, href: "/connect" },
  { label: "More", icon: MoreHorizontal },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-bg-base lg:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href != null && pathname.startsWith(tab.href);

          if (!tab.href) {
            return (
              <span
                key={tab.label}
                aria-disabled
                className="flex flex-1 flex-col items-center gap-1 py-1 text-text-muted opacity-40"
              >
                <Icon className="h-5 w-5" />
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
              <Icon className="h-5 w-5" />
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
