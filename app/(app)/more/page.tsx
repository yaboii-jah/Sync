import type { Metadata } from "next";
import Link from "next/link";
import { Card, Typography } from "@/components/ui/static";
import { Camera, Globe, type LucideIcon } from "lucide-react";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSpeakersSponsors } from "@/lib/supabase/queries/directory";
import { getQuickLinks } from "@/lib/supabase/queries/quick-links";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { DirectoryClient } from "@/components/more/directory-client";

export const metadata: Metadata = {
  title: "More — Sync",
};

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  camera: Camera,
};

function isInternalQuickLink(url: string) {
  return url.startsWith("/") && !url.startsWith("//");
}

export default async function MorePage() {
  await requireCompleteProfile();

  const supabase = await createClient();
  const [quickLinks, people] = await Promise.all([
    getQuickLinks(supabase),
    getSpeakersSponsors(supabase),
  ]);
  const speakers = people.filter((person) => person.role === "speaker");

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-md px-4 pt-8 lg:max-w-5xl lg:px-10 lg:pt-10">
        <AppHeader />
        <PageHeader title="More" />

        {quickLinks.length > 0 ? (
          <section className="mt-8">
            <Typography.Heading level={2} className="text-base">
              Quick links
            </Typography.Heading>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {quickLinks.map((link) => {
                const Icon = (link.icon && ICONS[link.icon]) || Globe;
                const content = (
                  <Card className="hover:bg-default h-full transition-colors">
                    <Card.Content className="flex items-center gap-3 py-4">
                      <span
                        aria-hidden
                        className="bg-surface-secondary flex size-10 shrink-0 items-center justify-center rounded-full"
                      >
                        <Icon className="size-5" />
                      </span>
                      <Typography type="body-sm" weight="medium">
                        {link.label}
                      </Typography>
                    </Card.Content>
                  </Card>
                );

                if (isInternalQuickLink(link.url)) {
                  return (
                    <Link key={link.id} href={link.url} className="rounded-xl">
                      {content}
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl"
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 mb-4">
          <Typography.Heading level={2} className="text-base">
            Speakers
          </Typography.Heading>
          <Typography type="body-sm" color="muted" className="mt-1">
            Meet the speakers sharing their work and perspective on event day.
          </Typography>
          <div className="mt-3">
            <DirectoryClient people={speakers} />
          </div>
        </section>
      </div>
    </main>
  );
}
