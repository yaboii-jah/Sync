import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";

const links = [["/super-admin", "Overview"], ["/super-admin/events", "Events"], ["/super-admin/users", "Users"], ["/super-admin/feedback", "Feedback"], ["/super-admin/audit", "Audit"]] as const;
export function PlatformAdminShell({ children }: { children: ReactNode }) {
  return <div className="sync-app app-field flex min-h-dvh flex-col">
    <header className="platform-frame border-b py-5 platform-rule">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/super-admin" className="platform-link identity-font text-2xl uppercase">Sync</Link><p className="platform-kicker mt-1">Platform operations</p></div><div className="flex flex-wrap items-center gap-3"><Link href="/events" className="platform-link text-sm">Leave operations</Link><SignOutButton variant="labeled" /></div></div>
      <nav aria-label="Platform operations" className="mt-5 flex flex-wrap gap-x-5 gap-y-2">{links.map(([href,label]) => <Link key={href} href={href} className="platform-link text-sm">{label}</Link>)}</nav>
    </header><main className="flex-1">{children}</main>
    <footer className="platform-frame mt-16 border-t py-6 platform-rule"><p className="text-xs text-muted">Sync platform operations · Privileged actions are audited</p></footer>
  </div>;
}
