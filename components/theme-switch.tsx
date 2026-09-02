"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@heroui/react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSwitch() {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Theme">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = mounted && theme === option.key;

        return (
          <Button
            key={option.key}
            size="sm"
            variant={isActive ? "primary" : "secondary"}
            aria-pressed={isActive}
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
