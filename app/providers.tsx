"use client";

import type { ReactNode } from "react";
import { InstallProvider } from "@/components/push/install-provider";
import { ToastProvider } from "@/components/toast/toast-provider";
import { AppearanceProvider } from "@/components/appearance-provider";

/**
 * App-wide client providers.
 *
 * - AppearanceProvider owns browser-local app appearance; public tokens stay light.
 * - ToastProvider mounts the application toast region once.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <ToastProvider>
        <InstallProvider>{children}</InstallProvider>
      </ToastProvider>
    </AppearanceProvider>
  );
}
