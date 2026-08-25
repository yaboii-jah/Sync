"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs font-bold tracking-[0.24em] text-state-error uppercase">
        Something broke
      </p>
      <h1 className="mt-3 font-display text-5xl text-text-primary uppercase">
        Turbulence
      </h1>
      <p className="mt-4 max-w-sm text-text-muted">
        An unexpected error interrupted the app. Try again — if it keeps
        happening, come back in a moment.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-text-muted/70">ref: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-colors hover:bg-light-green"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/home"
          className="rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-muted uppercase transition-colors hover:text-text-primary"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
