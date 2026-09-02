import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getPublicNetworkingCard } from "@/lib/supabase/queries/networking";
import {
  SOCIAL_NETWORK_LABELS,
  type SocialNetwork,
} from "@/lib/social-profiles";

export const metadata: Metadata = {
  title: "Connect — Sync",
  robots: { index: false, follow: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NETWORK_BUTTON_STYLES: Record<SocialNetwork, string> = {
  linkedin: "bg-sky-blue text-charcoal hover:bg-pastel-yellow",
  instagram: "bg-pastel-yellow text-charcoal hover:bg-light-green",
  facebook: "bg-light-green text-charcoal hover:bg-sky-blue",
};

export default async function PublicNetworkingCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const card = UUID_PATTERN.test(token)
    ? await getPublicNetworkingCard(token)
    : null;

  return (
    <main className="flex min-h-full w-full items-center justify-center bg-bg-base px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="block text-center font-display text-3xl tracking-[0.08em] text-text-primary uppercase"
        >
          Sync
        </Link>

        {card ? (
          <section className="mt-8 rounded-3xl border border-border-default bg-bg-base px-6 py-8 text-center shadow-[0_0_40px_rgba(188,131,48,0.2)]">
            <p className="text-xs font-bold tracking-[0.2em] text-text-muted uppercase">
              Connect with
            </p>
            <div className="mx-auto mt-5 h-24 w-24 overflow-hidden rounded-full border-2 border-border-default">
              {card.photoUrl ? (
                <Image
                  src={card.photoUrl}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-surface font-display text-4xl text-text-primary">
                  {(card.name || "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl text-text-primary uppercase">
              {card.name || "Attendee"}
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Choose where you want to connect.
            </p>

            <div className="mt-7 flex flex-col gap-3">
              {card.links.map((link) => (
                <a
                  key={link.network}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold tracking-[0.14em] uppercase transition-all active:scale-95 ${NETWORK_BUTTON_STYLES[link.network]}`}
                >
                  {SOCIAL_NETWORK_LABELS[link.network]}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ))}
            </div>

            <p className="mt-6 text-xs leading-relaxed text-text-muted/80">
              These destinations were provided by the attendee and are not
              verified by Sync.
            </p>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-border-default bg-bg-base px-6 py-10 text-center">
            <h1 className="font-display text-2xl text-text-primary uppercase">
              Card unavailable
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              This attendee has not published their card, or they have disabled
              the code. Ask them to open Connect in Sync.
            </p>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-text-muted">
          AWS Student Community Day Mega Manila 2026
        </p>
      </div>
    </main>
  );
}
