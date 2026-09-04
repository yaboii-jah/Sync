"use client";

import { useState } from "react";
import { Alert, Button, CloseButton } from "@heroui/react";
import { Download } from "lucide-react";
import {
  getInstallInstructions,
  useInstall,
} from "@/components/push/install-provider";

const STORAGE_KEY = "install-chip-dismissed";

export function InstallChip() {
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(STORAGE_KEY) === "1",
  );
  const [pending, setPending] = useState(false);
  const { ready, canPrompt, isInstalled, platform, promptInstall } = useInstall();

  if (!ready || isInstalled || dismissed) return null;

  async function install() {
    setPending(true);
    try {
      await promptInstall();
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
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
              {canPrompt
                ? "Add it to your home screen for faster access on event day."
                : getInstallInstructions(platform)}
            </Alert.Description>
          </Alert.Content>
          {canPrompt ? (
            <Button size="sm" isPending={pending} onPress={install}>
              Install
            </Button>
          ) : null}
          <CloseButton aria-label="Dismiss install prompt" onPress={dismiss} />
      </Alert>
    </div>
  );
}
