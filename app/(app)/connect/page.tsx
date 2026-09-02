import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { SocialConnectCard } from "@/components/connect/connect-card";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ shared?: string }>;
}) {
  const { shared } = await searchParams;
  const { user, profile } = await requireCompleteProfile();
  const name = profile.name || "Attendee";

  const supabase = await createClient();
  const { data: socialProfiles } = await supabase
    .from("social_profiles")
    .select("network, url")
    .eq("user_id", user.id);

  const savedUrls: Record<string, string> = {};
  if (socialProfiles) {
    for (const row of socialProfiles) {
      savedUrls[row.network] = row.url;
    }
  }

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <AppHeader />
        <h1 className="mt-6 font-display text-3xl text-text-primary uppercase">
          Connect
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Show your code, make a connection.
        </p>
        {shared ? (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              shared === "ok"
                ? "bg-light-green/20 text-text-primary"
                : "bg-state-error/20 text-state-error"
            }`}
          >
            {shared === "ok"
              ? "Saved. Your code now opens your LinkedIn profile directly."
              : shared === "miss"
                ? "That didn't look like a LinkedIn profile link. Open your profile in LinkedIn, then Share it to Sync."
                : "Couldn't save that link. Try again, or set it in Settings."}
          </p>
        ) : null}

        <div className="mt-6">
          <SocialConnectCard
            name={name}
            photoUrl={profile.photo_url}
            savedUrls={savedUrls}
          />
        </div>
      </div>
    </main>
  );
}
