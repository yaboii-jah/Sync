"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui";
import { useAppearance } from "@/components/appearance-provider";

export function AppearanceToggle() {
  const { mode, toggle } = useAppearance();
  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button
      variant="ghost"
      isIconOnly
      className="appearance-toggle min-h-11 min-w-11 shrink-0"
      aria-label={label}
      onPress={toggle}
    >
      <Sun className="appearance-sun size-5" aria-hidden />
      <Moon className="appearance-moon size-5" aria-hidden />
    </Button>
  );
}
