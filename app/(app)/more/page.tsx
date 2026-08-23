import type { Metadata } from "next";
import {
  Camera,
  Globe,
  ChevronRight,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSpeakersSponsors } from "@/lib/supabase/queries/directory";
import { getQuickLinks } from "@/lib/supabase/queries/quick-links";
import { DirectoryClient } from "@/components/more/directory-client";

export const metadata: Metadata = {
  title: "More — Sync",
};

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  camera: Camera,
};

export default async function MorePage() {
  await requireCompleteProfile();

  const supabase = await createClient();
  const [quickLinks, people] = await Promise.all([
    getQuickLinks(supabase),
    getSpeakersSponsors(supabase),
  ]);

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-3xl lg:px-10 lg:pt-10">
        <h1 className="font-display text-3xl text-text-primary uppercase">
          More
        </h1>

        {quickLinks.length > 0 ? (
          <>
            <h2 className="mt-8 text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
              Quick Links
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {quickLinks.map((link) => {
                const Icon = (link.icon && ICONS[link.icon]) || Globe;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-border-default bg-bg-base px-4 py-4 transition-colors hover:bg-accent-primary/20"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary/40 text-state-success">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {link.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </>
        ) : null}

        <h2 className="mt-8 text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
          Account
        </h2>
        <Link
          href="/settings"
          className="mt-3 flex items-center gap-4 rounded-2xl border border-border-default bg-bg-base px-4 py-4 transition-colors hover:bg-accent-primary/20"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-primary/40 text-state-success">
            <User className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-text-primary">
              Account Settings
            </span>
            <span className="block text-sm text-text-muted">
              Update your name and LinkedIn URL
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
        </Link>

        <h2 className="mt-8 text-xs font-bold tracking-[0.24em] text-text-muted uppercase">
          Speakers &amp; Sponsors
        </h2>
        <div className="mb-4 mt-3">
          <DirectoryClient people={people} />
        </div>
      </div>
    </main>
  );
}
