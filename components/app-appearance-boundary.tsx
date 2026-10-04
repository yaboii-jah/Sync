"use client";

import { useCallback, useState, type ReactNode } from "react";
import { UNSAFE_PortalProvider } from "react-aria";

/** App overlays inherit the same scoped palette without a new scroll container. */
export function AppAppearanceBoundary({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const getContainer = useCallback(() => host, [host]);
  return (
    <UNSAFE_PortalProvider getContainer={getContainer}>
      {children}
      <div ref={setHost} className="app-theme-surface" data-app-overlay-host="" />
    </UNSAFE_PortalProvider>
  );
}
