import Link from "next/link";
import { Typography } from "@heroui/react";
import { ShieldCheck, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";

const iconLink =
  "text-muted hover:text-foreground hover:bg-default rounded-lg p-2 transition-colors";

export async function AppHeader() {
  const isAdmin = await currentUserIsAdmin();

  return (
    <header className="flex items-center justify-between lg:hidden">
      <Link href="/home">
        <Typography type="h6" weight="semibold">
          Sync
        </Typography>
      </Link>
      <div className="flex items-center gap-1">
        {isAdmin ? (
          <Link
            href="/admin"
            aria-label="Switch to admin view"
            className={iconLink}
          >
            <ShieldCheck className="size-5" aria-hidden />
          </Link>
        ) : null}
        <Link
          href="/settings"
          aria-label="Account settings"
          className={iconLink}
        >
          <User className="size-5" aria-hidden />
        </Link>
        <SignOutButton variant="icon" />
      </div>
    </header>
  );
}
