"use client";

import { useState } from "react";
import { Button, Card, Chip, Typography } from "@heroui/react";
import { Download } from "lucide-react";
import {
  getInstallInstructions,
  useInstall,
} from "@/components/push/install-provider";

export function InstallSettings() {
  const { ready, canPrompt, isInstalled, platform, promptInstall } = useInstall();
  const [pending, setPending] = useState(false);

  async function install() {
    setPending(true);
    try {
      await promptInstall();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mt-4">
      <Card.Header>
        <Card.Title>Install Sync</Card.Title>
        <Card.Description>
          Keep Sync easy to open throughout event day.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {isInstalled ? (
          <>
            <Chip variant="secondary" size="sm" className="w-fit">
              Installed
            </Chip>
            <Typography type="body-sm" color="muted">
              Sync is installed on this device.
            </Typography>
          </>
        ) : !ready ? (
          <Typography type="body-sm" color="muted">
            Checking installation options...
          </Typography>
        ) : canPrompt ? (
          <Button fullWidth isPending={pending} onPress={install}>
            <Download className="size-4" aria-hidden />
            Install app
          </Button>
        ) : (
          <Typography type="body-sm" color="muted">
            {getInstallInstructions(platform)}
          </Typography>
        )}
      </Card.Content>
    </Card>
  );
}
