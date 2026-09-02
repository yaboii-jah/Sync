import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { AppHeader } from "@/components/app-header";
import { ConnectCard } from "@/components/connect/connect-card";
import { ConnectManager } from "@/components/connect/connect-manager";
import { getOwnerNetworkingCard } from "@/lib/supabase/queries/networking";

export const metadata: Metadata = {
  title: "Connect — Sync",
};

export default async function ConnectPage() {
  const { profile } = await requireCompleteProfile();
  const card = await getOwnerNetworkingCard();
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
        <div className="mt-6">
          <ConnectCard
            name={name}
            photoUrl={profile.photo_url}
            publicCardUrl={`${origin}/u/${card.publicToken}`}
            isPublic={card.isPublic}
            hasLinks={card.links.length > 0}
          />
        </div>
        <ConnectManager
          isPublic={card.isPublic}
          links={Object.fromEntries(
            card.links.map((link) => [link.network, link.url]),
          )}
        />
      </div>
    </main>
  );
}
