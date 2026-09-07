"use client";

import { useEffect, useState } from "react";
import { Button, Typography } from "@/components/ui";
import { X } from "lucide-react";
import {
  getInstallInstructions,
  useInstall,
} from "@/components/push/install-provider";
import { useInstallPromptReleased } from "@/components/push/first-run-signal";

const STORAGE_KEY = "install-chip-dismissed";

export function InstallChip() {
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(STORAGE_KEY) === "1",
  );
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { ready, canPrompt, isInstalled, platform, promptInstall } = useInstall();
  // FR-5 / D-2: the push dialog goes first. The short delay below is not
  // replaced, it is now measured from the moment that dialog lets go.
  const pushPromptReleased = useInstallPromptReleased();

  useEffect(() => {
    if (!ready || isInstalled || dismissed || !pushPromptReleased) {
      const timer = window.setTimeout(() => setVisible(false), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [dismissed, isInstalled, pushPromptReleased, ready]);

  if (!ready || isInstalled || dismissed || !pushPromptReleased || !visible) {
    return null;
  }

  async function install() {
    setPending(true);
    try {
      const outcome = await promptInstall();
      if (outcome === null) setShowInstructions(true);
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0 lg:w-96">
      <section
        aria-label="Install Sync"
        className="install-popup pointer-events-auto rounded-2xl border border-border bg-surface p-4 text-foreground shadow-overlay"
      >
        <div className="flex items-start justify-between gap-3">
          <Typography type="body-sm" weight="semibold" className="pt-1">
            Install Sync
          </Typography>
          <Button
            variant="ghost"
            isIconOnly
            aria-label="Dismiss install prompt"
            onPress={dismiss}
            className="!size-11 !shrink-0 !border-transparent !bg-transparent !text-accent shadow-none hover:!bg-transparent"
          >
            <X className="!size-6" strokeWidth={3} aria-hidden />
          </Button>
        </div>
        <Typography type="body-sm" color="muted" className="mt-1 leading-5">
          {canPrompt
            ? "Add it to your home screen for faster access on event day."
            : "Install Sync for one-tap access on event day."}
        </Typography>
        <Button
          size="sm"
          isPending={pending}
          onPress={install}
          aria-expanded={showInstructions}
          aria-controls="install-instructions"
          className="mt-4 w-full"
        >
          Install Sync
        </Button>
        {!canPrompt && showInstructions ? (
          <Typography
            id="install-instructions"
            type="body-xs"
            color="muted"
            className="mt-3 leading-5"
          >
            {getInstallInstructions(platform)}
          </Typography>
        ) : null}
      </section>
    </div>
  );
}
