import Link from "next/link";
import Image from "next/image";
import { Avatar, Typography } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";
import { ResponsiveSignOutButton } from "@/components/responsive-sign-out-button";

const iconLink =
  "text-muted hover:text-foreground hover:bg-default rounded-lg p-2 transition-colors";

export async function AppHeader() {
  const [isAdmin, auth] = await Promise.all([
    currentUserIsAdmin(),
    getAuthenticatedProfile(),
  ]);
  const profile = auth?.profile ?? null;

  return (
    <header className="flex items-center justify-between lg:hidden">
      {/* iOS large-title treatment: the brand is the page title. */}
      <Link href="/home" className="flex items-center gap-2">
        <Image
          src="/icons/mascot-96.png"
          alt=""
          width={36}
          height={36}
          priority
          className="size-9 rounded-full object-cover"
        />
        <Typography.Heading
          level={1}
          className="text-[28px] font-bold tracking-tight"
        >
          Sync
        </Typography.Heading>
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
        {/*
          * The account entry is your face, the way iOS apps do it (App Store,
           * FaceTime): the Google photo when there is one, otherwise
          * the initial.
          */}
        <Link
          href="/settings"
          aria-label="Account settings"
          className="rounded-full p-1 transition-opacity active:opacity-70"
        >
          <Avatar size="sm">
            {profile?.photo_url ? (
              <Avatar.Image src={profile.photo_url} alt="" />
            ) : null}
            <Avatar.Fallback>
              {(profile?.name?.trim()[0] ?? "?").toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
        </Link>
        <ResponsiveSignOutButton showOn="mobile" />
      </div>
    </header>
  );
}
