"use client";

import type { ReactNode } from "react";
import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { InstallProvider } from "@/components/push/install-provider";

/**
 * App-wide client providers.
 *
 * - next-themes drives HeroUI's built-in light/dark themes by writing the
 *   `dark` class onto <html>. New sessions default to light mode and the
 *   navigation control switches explicitly between light and dark.
 * - Toast.Provider is HeroUI's toast region. It is mounted once here; toasts
 *   are fired imperatively from anywhere via the `toast()` function.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <InstallProvider>{children}</InstallProvider>
      <Toast.Provider placement="bottom" />
    </ThemeProvider>
  );
}
