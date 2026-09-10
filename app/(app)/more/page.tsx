import type { Metadata } from "next";
import { Typography } from "@/components/ui/static";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getSpeakersSponsors } from "@/lib/supabase/queries/directory";
import { getQuickLinks } from "@/lib/supabase/queries/quick-links";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { DirectoryClient } from "@/components/more/directory-client";
import { QuickLinksClient } from "@/components/more/quick-links-client";

export const metadata: Metadata = {
  title: "More — Sync",
};

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
            <QuickLinksClient quickLinks={quickLinks} />
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
