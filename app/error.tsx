"use client";

import { ErrorState } from "@/components/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something broke"
      reference={error.digest ? `Reference ${error.digest}` : undefined}
      description="An unexpected error interrupted the app. Try again. If it keeps happening, come back in a moment."
      reset={reset}
    />
  );
}
