"use client";

import { useEffect } from "react";

export function AuthComplete({ destination }: { destination: string }) {
  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <a
      href={destination}
      className="mt-6 text-sm text-text-muted underline underline-offset-4"
    >
      Continue to Sync
    </a>
  );
}
