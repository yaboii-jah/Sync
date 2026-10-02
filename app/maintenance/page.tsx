import type { Metadata } from "next";
import { maintenanceCopy } from "@/lib/maintenance";

export const metadata: Metadata = {
  title: maintenanceCopy.title,
  description: maintenanceCopy.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <main className="app-field flex min-h-svh items-center justify-center px-5 py-12">
      <section
        aria-labelledby="maintenance-title"
        className="w-full max-w-xl rounded-3xl border border-border bg-surface px-6 py-10 text-center shadow-xl sm:px-10 sm:py-14"
      >
        <p className="identity-font text-3xl tracking-[0.12em] text-accent">
          Sync
        </p>
        <p
          role="status"
          className="mt-8 inline-flex rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent"
        >
          Planned maintenance
        </p>
        <h1
          id="maintenance-title"
          className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {maintenanceCopy.heading}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted">
          {maintenanceCopy.body}
        </p>
      </section>
    </main>
  );
}
