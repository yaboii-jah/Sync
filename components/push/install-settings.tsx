"use client";

import { useState } from "react";
import { Button, Card, Chip, Typography } from "@/components/ui";
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
      <Card.Header className="gap-2">
        <Card.Title>Install Sync</Card.Title>
        <Card.Description>
          Keep Sync easy to open throughout event day.
        </Card.Description>
      </Card.Header>
      <Card.Content className="mt-4 flex flex-col gap-4">
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
        ) : (
          <>
            <Button fullWidth isPending={pending} onPress={install}>
              <Download className="size-4" aria-hidden />
              Install Sync
            </Button>
            {!canPrompt ? (
              <Typography type="body-sm" color="muted">
                {getInstallInstructions(platform)}
              </Typography>
            ) : null}
          </>
        )}
      </Card.Content>
    </Card>
  );
}
