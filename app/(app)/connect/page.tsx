import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { ConnectCard } from "@/components/connect/connect-card";
import { linkedInScanTarget } from "@/lib/linkedin";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ shared?: string }>;
}) {
  // Set by /share when an attendee shares their profile in from LinkedIn.
  // Without it the save is silent, which reads as the share having failed.
  const { shared } = await searchParams;
  const { profile } = await requireCompleteProfile();
  const name = profile.name || "Attendee";

  /*
   * The QR must carry an absolute URL — a scanner's camera has no origin to
   * resolve a relative path against. `origin` is preferred over the env var so
   * a preview deployment produces a code that points at itself rather than at
   * production.
   */
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${headerList.get("host") ?? ""}`;

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
          <ConnectCard
            name={name}
            photoUrl={profile.photo_url}
            qrValue={`${origin}/u/${profile.id}`}
            linkedinUrl={linkedInScanTarget(profile.linkedin_url, name)}
          />
        </div>
      </div>
    </main>
  );
}
