"use client";

import { RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-xs font-bold tracking-[0.24em] text-state-error uppercase">
        Something broke
      </p>
      <h1 className="mt-3 font-display text-4xl text-text-primary uppercase">
        Turbulence
      </h1>
      <p className="mt-4 max-w-sm text-sm text-text-muted">
        This screen hit an unexpected error. Your data is safe — try again.
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
      </div>
    </main>
  );
}
