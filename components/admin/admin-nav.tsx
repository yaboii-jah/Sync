"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BellRing,
  ClipboardList,
  House,
  Radio,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ITEMS: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: Activity },
  { label: "Notifications", href: "/admin/notifications", icon: BellRing },
  { label: "Program", href: "/admin/sessions", icon: Radio },
  { label: "Attendees", href: "/admin/attendees", icon: Users },
  { label: "Audit", href: "/admin/audit", icon: ClipboardList },
];

export function AdminNav() {
  const pathname = usePathname();

  function active(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-default bg-bg-base lg:flex">
        <div className="border-b border-border-default px-6 py-6">
          <p className="text-[0.65rem] font-bold tracking-[0.24em] text-pastel-yellow uppercase">
            Event operations
          </p>
          <p className="mt-1 font-display text-3xl text-text-primary uppercase">Control Room</p>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-5">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                  active(item.href)
                    ? "bg-accent-primary/50 text-state-success"
                    : "text-text-muted hover:bg-accent-primary/20 hover:text-text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border-default px-3 py-5">
          <Link
            href="/home"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-pastel-yellow transition-colors hover:bg-accent-primary/20"
          >
            <House className="h-5 w-5" />
            Attendee view
          </Link>
          <SignOutButton variant="labeled" />
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-border-default bg-bg-base/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.58rem] font-bold tracking-[0.22em] text-pastel-yellow uppercase">
              Event operations
            </p>
            <p className="font-display text-xl text-text-primary uppercase">Control Room</p>
          </div>
          <Link
            href="/home"
            className="flex items-center gap-1.5 rounded-full border border-border-default px-3 py-2 text-[0.65rem] font-bold tracking-wide text-pastel-yellow uppercase"
          >
            <House className="h-4 w-4" />
            Attendee
          </Link>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active(item.href) ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${
                  active(item.href)
                    ? "bg-pastel-yellow text-charcoal"
                    : "text-text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
