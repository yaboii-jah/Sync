"use client";

import type { ReactNode } from "react";
import { InstallProvider } from "@/components/push/install-provider";
import { ToastProvider } from "@/components/toast/toast-provider";

/**
 * App-wide client providers.
 *
 * - The root layout supplies the fixed light event theme.
 * - ToastProvider mounts the application toast region once.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <InstallProvider>{children}</InstallProvider>
    </ToastProvider>
  );
}
