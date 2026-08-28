import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { getScanProfile } from "@/lib/supabase/queries/scan";
import { linkedInScanTarget } from "@/lib/linkedin";
import { requireCompleteProfile } from "@/lib/supabase/profile";

export const metadata: Metadata = {
  title: "Connection — Sync",
};

/**
 * Where a scanned networking QR lands.
 *
 * The QR encodes this route rather than a LinkedIn URL, which is what removes
 * the setup step entirely: `name` and `photo_url` both come from the LinkedIn
 * sign-in, so an attendee's card is complete the moment they first sign in and
 * there is nothing to type, paste or confirm.
 *
 * The card always identifies the person exactly — Sync knows whose id is in the
 * URL. Only the final hop to LinkedIn can be imprecise, and only for someone who
 * has never set a profile URL: `linkedInScanTarget` falls back to a name search
 * there. Anyone who has set one gets a direct profile link.
 *
 * Sign-in is required, so the reader is a fellow attendee rather than anyone who
 * happens to point a camera at a photo of the code.
 */
export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Gates on sign-in and gives the scanner their own nav shell.
  await requireCompleteProfile();

  const { id } = await params;
  const profile = await getScanProfile(id);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:pt-10">
        <AppHeader />

        {profile ? (
          <>
            <p className="mt-6 text-xs font-bold tracking-[0.18em] text-text-muted uppercase">
              You met
            </p>

            <div className="mt-4 rounded-2xl border border-border-default bg-bg-base px-6 py-8 text-center">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-border-default">
                {profile.photo_url ? (
                  <Image
                    src={profile.photo_url}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-surface font-display text-4xl text-text-primary">
                    {(profile.name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-display text-2xl text-text-primary uppercase">
                {profile.name || "Attendee"}
              </h1>

              <a
                href={linkedInScanTarget(
                  profile.linkedin_url,
                  profile.name || "",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green active:scale-95"
              >
                <ExternalLink className="h-4 w-4" />
                Connect on LinkedIn
              </a>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-border-default bg-bg-base px-6 py-10 text-center">
            <h1 className="font-display text-xl text-text-primary uppercase">
              Card not found
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              That code doesn&apos;t match an attendee. Ask them to open Connect
              and show it again.
            </p>
          </div>
        )}

        <Link
          href="/home"
          className="mt-6 flex w-full items-center justify-center rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-accent-primary/30 active:scale-95"
        >
          Back to Sync
        </Link>
      </div>
    </main>
  );
}
