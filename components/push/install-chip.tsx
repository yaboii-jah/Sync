"use client";

import { useEffect, useState } from "react";
import { Alert, Button, CloseButton } from "@heroui/react";
import { Download } from "lucide-react";

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
    <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md lg:inset-x-auto lg:right-6 lg:bottom-6 lg:mx-0 lg:w-96">
      <Alert>
        <Alert.Indicator>
          <Download className="size-5" aria-hidden />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Install Sync</Alert.Title>
          <Alert.Description>
            Add it to your home screen for faster access on event day.
          </Alert.Description>
        </Alert.Content>
        <Button size="sm" onPress={install}>
          Install
        </Button>
        <CloseButton aria-label="Dismiss install prompt" onPress={dismiss} />
      </Alert>
    </div>
  );
}
