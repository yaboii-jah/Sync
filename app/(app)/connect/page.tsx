import type { Metadata } from "next";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { ConnectCard } from "@/components/connect/connect-card";
import { linkedInScanTarget } from "@/lib/linkedin";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

export default async function ConnectPage() {
  const { profile } = await requireCompleteProfile();
  const name = profile.name || "Attendee";

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
        <div className="mt-6">
          <ConnectCard
            name={name}
            photoUrl={profile.photo_url}
            linkedinUrl={linkedInScanTarget(profile.linkedin_url, name)}
          />
        </div>
      </div>
    </main>
  );
}
