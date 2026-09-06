"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type InstallPlatform = "ios" | "android" | "desktop";
export type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

interface InstallSnapshot {
  ready: boolean;
  canPrompt: boolean;
  isInstalled: boolean;
  platform: InstallPlatform;
}

interface InstallContextValue extends InstallSnapshot {
  promptInstall: () => Promise<InstallOutcome | null>;
}

const SERVER_SNAPSHOT: InstallSnapshot = {
  ready: false,
  canPrompt: false,
  isInstalled: false,
  platform: "desktop",
};

let snapshot = SERVER_SNAPSHOT;
let promptEvent: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function detectPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent;

  if (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/.test(userAgent)) return "android";
  return "desktop";
}

function detectStandalone(mediaQuery: MediaQueryList): boolean {
  const iosStandalone =
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return mediaQuery.matches || iosStandalone;
}

function notify(nextSnapshot: InstallSnapshot) {
  snapshot = nextSnapshot;
  for (const listener of listeners) listener();
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const platform = detectPlatform();
  const updateStandalone = () => {
    notify({
      ...snapshot,
      isInstalled: detectStandalone(standaloneQuery),
      canPrompt: Boolean(promptEvent) && !detectStandalone(standaloneQuery),
    });
  };
  const handleBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    promptEvent = event as BeforeInstallPromptEvent;
    notify({
      ...snapshot,
      canPrompt: !snapshot.isInstalled,
    });
  };
  const handleAppInstalled = () => {
    promptEvent = null;
    notify({
      ...snapshot,
      canPrompt: false,
      isInstalled: true,
    });
  };

  notify({
    ready: true,
    canPrompt: false,
    isInstalled: detectStandalone(standaloneQuery),
    platform,
  });
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  standaloneQuery.addEventListener("change", updateStandalone);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

async function promptInstall(): Promise<InstallOutcome | null> {
  const event = promptEvent;
  if (!event) return null;

  promptEvent = null;
  notify({ ...snapshot, canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <InstallContext.Provider value={{ ...current, promptInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall(): InstallContextValue {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error("useInstall must be used within InstallProvider");
  }

  return context;
}

export function getInstallInstructions(platform: InstallPlatform): string {
  switch (platform) {
    case "ios":
      return "In Safari, tap Share, then choose Add to Home Screen.";
    case "android":
      return "Open your browser menu, then choose Install app or Add to Home screen.";
    default:
      return "Use your browser's install icon or menu, then choose Install Sync.";
  }
}
