"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};

export function ThemeSwitch() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");
  const currentLabel = isDark ? "Dark" : "Light";
  const nextLabel = isDark ? "light" : "dark";

  return (
    <Button
      size="sm"
      variant="primary"
      aria-label={`Switch to ${nextLabel} mode`}
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
      {currentLabel}
    </Button>
  );
}
