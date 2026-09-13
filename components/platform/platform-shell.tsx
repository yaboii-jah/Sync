import Link from "next/link";
import type { ReactNode } from "react";

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="tenant-platform flex min-h-dvh flex-col">
      <header className="platform-frame flex min-h-20 items-center justify-between border-b platform-rule">
        <Link href="/events" className="platform-link text-lg tracking-[-0.04em]" aria-label="Sync event index">
          Sync<span aria-hidden className="text-accent">/</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/events" className="platform-link px-2 text-sm">Events</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="platform-frame mt-16 border-t py-6 platform-rule">
        <p className="text-xs text-muted">© 2026 · Sync · Event flow without the scramble</p>
      </footer>
    </div>
  );
}
