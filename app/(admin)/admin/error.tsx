"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <ErrorState
      title="Operations unavailable"
      description="The admin data could not be loaded. No change was made."
      reset={reset}
      homeHref="/admin"
      homeLabel="Back to Admin"
    />
  );
}
