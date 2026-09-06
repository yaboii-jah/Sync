"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  Button,
  Card,
  Chip,
  Separator,
  Typography,
} from "@/components/ui";
import { Download, Eye } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_SPECS, type SocialNetwork } from "@/lib/social";

const QR_FOREGROUND = "#024056";
const QR_BACKGROUND = "#FFFFFF";

interface ConnectCardProps {
  configuredNetworks: SocialNetwork[];
  cardUrl: string;
  hasSavedLinks: boolean;
}

export function ConnectCard({
  configuredNetworks,
  cardUrl,
  hasSavedLinks,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sync-networking-card-qr.png";
    link.click();
  }

  function previewCard() {
    if (!cardUrl) return;

    const previewUrl = new URL(cardUrl);
    previewUrl.searchParams.set("preview", "1");
    window.open(previewUrl.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <Card.Content className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div
            className="border-border mt-4 w-full max-w-[272px] rounded-2xl border p-4"
            style={{ backgroundColor: QR_BACKGROUND }}
          >
            <div className="mx-auto aspect-square w-full max-w-[240px]">
              <QRCodeSVG
                value={cardUrl}
                size={240}
                className="block size-full"
                fgColor={QR_FOREGROUND}
                bgColor={QR_BACKGROUND}
              />
            </div>
          </div>

          <Typography type="body-xs" color="muted" className="mt-3">
            {hasSavedLinks
              ? "Scan to open my networking card"
              : "Add a social profile to activate this code"}
          </Typography>
        </div>

        <Button
          variant="secondary"
          fullWidth
          isDisabled={!hasSavedLinks || !cardUrl}
          onPress={saveQr}
        >
          <Download className="size-4" aria-hidden />
          Save QR
        </Button>

        <Button
          variant="secondary"
          fullWidth
          isDisabled={!hasSavedLinks || !cardUrl}
          onPress={previewCard}
        >
          <Eye className="size-4" aria-hidden />
          Preview social card
        </Button>

        <Separator />

        <div className="flex flex-col gap-3">
          <div>
            <Typography type="body-sm">Configured profiles</Typography>
            <Typography type="body-xs" color="muted">
              Manage your profile links in Account Settings.
            </Typography>
          </div>

          {configuredNetworks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {configuredNetworks.map((network) => (
                <Chip key={network} size="sm" variant="secondary">
                  {SOCIAL_SPECS[network].label}
                </Chip>
              ))}
            </div>
          ) : (
            <Typography type="body-sm" color="muted">
              No social profiles configured yet.
            </Typography>
          )}

          <Link href="/settings" className={`${secondaryLinkClass} w-full`}>
            Manage in Account Settings
          </Link>
        </div>

        <Separator />
      </Card.Content>

      <div ref={canvasWrapRef} aria-hidden className="hidden">
        {hasSavedLinks && cardUrl ? (
          <QRCodeCanvas
            value={cardUrl}
            size={512}
            fgColor={QR_FOREGROUND}
            bgColor={QR_BACKGROUND}
          />
        ) : null}
      </div>
    </Card>
  );
}
