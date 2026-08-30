import Link from "next/link";
import { ShieldCheck, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";

export async function AppHeader() {
  const isAdmin = await currentUserIsAdmin();

  return (
    <header className="flex items-center justify-between lg:hidden">
      <Link
        href="/home"
        className="font-display text-2xl text-text-primary uppercase"
      >
        Sync
      </Link>
      <div className="flex items-center gap-1">
        {isAdmin ? (
          <Link
            href="/admin"
            aria-label="Switch to admin view"
            className="rounded-lg p-2 text-pastel-yellow transition-colors hover:text-text-primary"
          >
            <ShieldCheck className="h-5 w-5" />
          </Link>
        ) : null}
        <Link
          href="/settings"
          aria-label="Account settings"
          className="rounded-lg p-2 text-text-muted transition-colors hover:text-text-primary"
        >
          <User className="h-5 w-5" />
        </Link>
        <SignOutButton variant="icon" />
      </div>
    </header>
  );
}
