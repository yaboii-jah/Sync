import type { Metadata } from "next";
import { Card, Chip, Typography } from "@/components/ui/static";
import { maintenanceCopy } from "@/lib/maintenance";

export const metadata: Metadata = {
  title: maintenanceCopy.title,
  description: maintenanceCopy.description,
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="app-field flex min-h-svh items-center justify-center px-5 py-12">
      <section aria-labelledby="maintenance-title" className="w-full min-w-0 max-w-xl">
        <Card className="rounded-3xl border border-border px-6 py-10 text-center sm:px-10 sm:py-14">
          <Typography className="identity-font text-3xl leading-9 tracking-[0.12em]">
            Sync
          </Typography>
          <Chip role="status" color="accent" variant="soft" size="lg" className="mt-8 rounded-full px-4 py-2">
            Planned maintenance
          </Chip>
          <Typography.Heading level={1} id="maintenance-title" className="mt-6 text-3xl leading-9 tracking-tight wrap-anywhere sm:text-4xl sm:leading-10">
            {maintenanceCopy.heading}
          </Typography.Heading>
          <Typography className="mx-auto mt-4 max-w-md text-base leading-7" color="muted">
            {maintenanceCopy.body}
          </Typography>
        </Card>
      </section>
    </main>
  );
}
