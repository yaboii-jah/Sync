"use client";

import { ErrorState } from "@/components/error-state";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      title="Something broke"
      reference={error.digest ? `Reference ${error.digest}` : undefined}
      description="This screen hit an unexpected error. Your data is safe."
      retry={retry}
    />
  );
}
