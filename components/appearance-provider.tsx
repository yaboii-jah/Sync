"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import {
  APPEARANCE_STORAGE_KEY,
  parseAppearancePreference,
  resolveAppearance,
  type AppearanceMode,
  type AppearancePreference,
} from "@/lib/appearance";

const APPEARANCE_CHANGED = "sync-app-appearance-change";
type Snapshot = `${AppearancePreference}:${AppearanceMode}`;
let transitionFrame: number | undefined;

function getSnapshot(): Snapshot {
  const root = document.documentElement;
  const preference = parseAppearancePreference(root.dataset.appPreference);
  const mode = resolveAppearance(preference, window.matchMedia("(prefers-color-scheme: dark)").matches);
  return `${preference}:${mode}`;
}

function getServerSnapshot(): Snapshot {
  return "system:light";
}

function applyPreference(preference: AppearancePreference) {
  const root = document.documentElement;
  const mode = resolveAppearance(
    preference,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  if (root.dataset.appAppearance !== mode) {
    // Color interpolation crosses unreadable pairs when light/dark roles invert.
    // Disable it for a painted frame, then restore normal control feedback.
    root.dataset.appAppearanceChanging = "";
    if (transitionFrame !== undefined) cancelAnimationFrame(transitionFrame);
    transitionFrame = requestAnimationFrame(() => {
      transitionFrame = requestAnimationFrame(() => {
        delete root.dataset.appAppearanceChanging;
        transitionFrame = undefined;
      });
    });
  }
  root.dataset.appPreference = preference;
  root.dataset.appAppearance = mode;
}

function subscribe(onChange: () => void) {
  const device = window.matchMedia("(prefers-color-scheme: dark)");
  const refresh = () => {
    applyPreference(parseAppearancePreference(document.documentElement.dataset.appPreference));
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_STORAGE_KEY && event.key !== null) return;
    applyPreference(parseAppearancePreference(event.newValue));
    onChange();
  };
  device.addEventListener("change", refresh);
  window.addEventListener(APPEARANCE_CHANGED, refresh);
  window.addEventListener("storage", onStorage);
  refresh();
  return () => {
    device.removeEventListener("change", refresh);
    window.removeEventListener(APPEARANCE_CHANGED, refresh);
    window.removeEventListener("storage", onStorage);
  };
}

function setAppearance(mode: AppearanceMode) {
  applyPreference(mode);
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  } catch {
    // A blocked/full store must not prevent switching for this session.
  }
  window.dispatchEvent(new Event(APPEARANCE_CHANGED));
}

const AppearanceContext = createContext<{
  mode: AppearanceMode;
  toggle: () => void;
} | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mode: AppearanceMode = snapshot.endsWith(":dark") ? "dark" : "light";
  return (
    <AppearanceContext.Provider value={{ mode, toggle: () => setAppearance(mode === "dark" ? "light" : "dark") }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error("Appearance controls require AppearanceProvider");
  return appearance;
}
