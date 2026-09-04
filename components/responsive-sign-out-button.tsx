"use client";

import { useSyncExternalStore } from "react";
import { SignOutButton } from "@/components/sign-out-button";

type Breakpoint = "mobile" | "desktop";

const MEDIA_QUERIES: Record<Breakpoint, string> = {
  mobile: "(max-width: 1023px)",
  desktop: "(min-width: 1024px)",
};

function subscribe(query: string, onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getServerSnapshot() {
  return false;
}

export function ResponsiveSignOutButton({
  showOn,
}: {
  showOn: Breakpoint;
}) {
  const query = MEDIA_QUERIES[showOn];
  const isVisible = useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );

  return isVisible ? <SignOutButton variant="icon" /> : null;
}
