"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator, Typography } from "@/components/ui";
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

  function isActive(href: string) {
    return href === "/admin" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      <aside className="border-border bg-surface fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r lg:flex">
        <div className="px-6 py-6">
          <Typography type="h5" weight="semibold" className="font-display">
            Control Room
          </Typography>
          <Typography type="body-xs" color="muted" className="mt-1">
            Event operations
          </Typography>
        </div>

        <Separator />

        <nav aria-label="Admin" className="flex flex-col gap-1 px-3 py-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-3 pl-2.5 text-sm transition-colors ${
                  active
                    ? "border-accent text-accent font-semibold"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 px-3 pb-6">
          <Separator className="mb-3" />
          <Link
            href="/home"
            className="text-muted hover:bg-default hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
          >
            <House className="size-5" aria-hidden />
            Attendee view
          </Link>
          <SignOutButton variant="labeled" />
        </div>
      </aside>

      <header className="border-border bg-surface sticky top-0 z-40 border-b px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Typography type="h6" weight="semibold" className="font-display">
            Control Room
          </Typography>
          <Link
            href="/home"
            className="text-muted hover:text-foreground border-border flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
          >
            <House className="size-4" aria-hidden />
            Attendee
          </Link>
        </div>
      </header>

      <nav
        aria-label="Admin"
        className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-stretch">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-center transition-colors active:scale-95 motion-reduce:transform-none ${
                    active ? "text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                <span
                  className={`max-w-full truncate text-[10px] leading-tight ${
                    active ? "font-semibold" : "font-normal"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
