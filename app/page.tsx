import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-default px-8 py-10 text-center">
        <h1 className="text-3xl font-bold text-text-primary">Sync</h1>
        <p className="mt-2 text-sm font-bold tracking-wide text-text-muted uppercase">
          Student Edition
        </p>
        <p className="mt-4 text-text-muted">
          Your companion app for AWS Student Community Day Manila 2026 — the
          live schedule, instant session alerts, and one-tap networking.
        </p>
        <Link
          href="/login"
          className="mt-8 block w-full rounded-lg bg-accent-primary px-5 py-3 font-bold text-text-primary transition-colors hover:brightness-125"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
