import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { signOut } from "@/app/(app)/home/actions";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between lg:hidden">
      <Link
        href="/home"
        className="font-display text-2xl text-text-primary uppercase"
      >
        Sync
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/settings"
          aria-label="Account settings"
          className="rounded-lg p-2 text-text-muted transition-colors hover:text-text-primary"
        >
          <User className="h-5 w-5" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            className="rounded-lg p-2 text-text-muted transition-colors hover:text-text-primary"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </form>
      </div>
    </header>
  );
}
