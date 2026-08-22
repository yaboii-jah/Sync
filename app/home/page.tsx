import Image from "next/image";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { signOut } from "./actions";

export default async function HomePage() {
  const { user, profile } = await requireCompleteProfile();

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-default px-8 py-10 text-center">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="mx-auto h-20 w-20 rounded-full border border-border-default object-cover"
          />
        ) : null}
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Hi, {profile.name || "there"}
        </h1>
        <p className="mt-3 text-text-muted">
          You&apos;re signed in as {user.email}. The full event dashboard is
          coming in the next phase.
        </p>
        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="w-full rounded-lg border border-border-default px-5 py-3 font-bold text-text-primary transition-colors hover:bg-accent-primary"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
