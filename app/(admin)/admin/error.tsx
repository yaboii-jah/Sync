"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/error-state";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <ErrorState
      title="Operations unavailable"
      description="The admin data could not be loaded. No change was made."
      retry={retry}
      homeHref="/admin"
      homeLabel="Back to Admin"
    />
  );
}
