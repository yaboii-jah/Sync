"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  href?: string;
}

const RAIL_ITEMS: RailItem[] = [
  { label: "Home", icon: House, href: "/home" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Connect", icon: QrCode, href: "/connect" },
  { label: "More", icon: MoreHorizontal, href: "/more" },
];

export function SideRail({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { unreadCount } = useAlertsCount();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-border-default bg-bg-base lg:flex">
      <p className="px-6 pt-7 font-display text-3xl tracking-wide text-text-primary uppercase">
        Sync
      </p>

      <nav className="mt-10 flex flex-col gap-1 px-3">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.href != null && pathname.startsWith(item.href);
          const showBadge =
            item.label === "Alerts" && item.href != null && unreadCount > 0;

          if (!item.href) {
            return (
              <span
                key={item.label}
                aria-disabled
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-text-muted opacity-40"
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-bold">{item.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? "bg-accent-primary/40 text-state-success [text-shadow:0_0_10px_rgba(88,222,105,0.6)]"
                  : "text-text-muted hover:bg-accent-primary/20 hover:text-text-primary"
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
              <span className="text-sm font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-3 pb-6">
        {isAdmin ? (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-pastel-yellow transition-colors hover:bg-accent-primary/20"
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="text-sm font-bold">Admin view</span>
          </Link>
        ) : null}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-accent-primary/40 text-state-success [text-shadow:0_0_10px_rgba(88,222,105,0.6)]"
              : "text-text-muted hover:bg-accent-primary/20 hover:text-text-primary"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-sm font-bold">Account</span>
        </Link>
        <SignOutButton variant="labeled" />
      </div>
    </aside>
  );
}

