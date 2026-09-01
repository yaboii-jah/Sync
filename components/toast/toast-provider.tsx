"use client";

import { useMemo } from "react";
import { toast as heroToast } from "@heroui/react";

type ToastVariant = "success" | "error";

/**
 * Thin wrapper over HeroUI's imperative toast so existing call sites keep the
 * same `const { toast } = useToast()` shape. The toast region itself is
 * mounted once in app/providers.tsx as <Toast.Provider />.
 */
export function useToast() {
  return useMemo(
    () => ({
      toast: (message: string, variant: ToastVariant = "success") => {
        heroToast(message, {
          variant: variant === "error" ? "danger" : "success",
        });
      },
    }),
    [],
  );
}
