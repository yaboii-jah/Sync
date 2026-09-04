"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const subscribe = () => () => {};

const THEME_OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSwitch({ showSystem = false }: { showSystem?: boolean }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");
  const currentLabel = isDark ? "Dark" : "Light";
  const nextLabel = isDark ? "light" : "dark";

  if (showSystem) {
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Theme">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = mounted && theme === option.key;

          return (
            <Button
              key={option.key}
              size="sm"
              variant={isActive ? "primary" : "secondary"}
              onPress={() => setTheme(option.key)}
              className="flex-1"
            >
              <Icon className="size-4" aria-hidden />
              {option.label}
            </Button>
          );
        })}
      </div>
    );
  }

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
