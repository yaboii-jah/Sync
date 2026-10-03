import Link from "next/link";
import Image from "next/image";
import { Typography } from "@/components/ui/static";
import { currentUserIsAdmin } from "@/lib/supabase/admin-auth";
import { getAuthenticatedProfile } from "@/lib/supabase/profile";
import { ProfileMenu } from "@/components/profile-menu";

export async function AppHeader() {
  const [isAdmin, auth] = await Promise.all([
    currentUserIsAdmin(),
    getAuthenticatedProfile(),
  ]);
  const profile = auth?.profile ?? null;

  return (
    <header className="flex items-center justify-between lg:hidden">
      {/* iOS large-title treatment: the brand is the page title. */}
      <Link href="/home" className="flex items-center gap-3">
        <Image
          src="/icons/mascot-96.png"
          alt=""
          width={36}
          height={36}
          preload
          className="size-9 object-contain"
        />
        <Typography.Heading level={1} className="identity-font text-[28px]">
          Sync
        </Typography.Heading>
      </Link>
      <ProfileMenu
        name={profile?.name}
        photoUrl={profile?.photo_url}
        isAdmin={isAdmin}
      />
    </header>
  );
}
