"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const STORAGE_KEY = "install-chip-dismissed";

export function InstallChip() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent) return null;

  async function install() {
    await promptEvent!.prompt();
    localStorage.setItem(STORAGE_KEY, "1");
    setPromptEvent(null);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setPromptEvent(null);
  }

  return (
    <div className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border-default bg-bg-base px-5 py-2.5 shadow-[0_0_20px_rgba(188,131,48,0.25)] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0">
      <p className="flex items-center gap-2 text-sm font-bold text-text-primary">
        <Download className="h-4 w-4 text-pastel-yellow" />
        Install Sync
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={install}
          className="rounded-full bg-pastel-yellow px-4 py-1.5 text-xs font-bold tracking-wide text-charcoal uppercase transition-colors hover:bg-light-green"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-full p-1.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
