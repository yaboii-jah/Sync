"use client";

import type { ReactNode } from "react";
import { Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";

/**
 * App-wide client providers.
 *
 * - next-themes drives HeroUI's built-in light/dark themes by writing the
 *   `dark` class onto <html>. Default is "system" so the app follows the OS
 *   until the user picks a mode in Settings.
 * - Toast.Provider is HeroUI's toast region. It is mounted once here; toasts
 *   are fired imperatively from anywhere via the `toast()` function.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toast.Provider placement="bottom" />
    </ThemeProvider>
  );
}
