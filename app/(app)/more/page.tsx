import type { Metadata } from "next";
import { Card, Typography } from "@heroui/react";
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
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl"
                  >
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
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8 mb-4">
          <Typography.Heading level={2} className="text-base">
            Speakers and sponsors
          </Typography.Heading>
          <div className="mt-3">
            <DirectoryClient people={people} />
          </div>
        </section>
      </div>
    </main>
  );
}
