"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  Button,
  Card,
  Chip,
  Separator,
  Switch,
  Typography,
} from "@heroui/react";
import { Download, Eye, QrCode } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_SPECS, type SocialNetwork } from "@/lib/social";

const QR_FOREGROUND = "#171717";
const QR_BACKGROUND = "#FFFFFF";

interface ConnectCardProps {
  configuredNetworks: SocialNetwork[];
  cardUrl: string | null;
  isPublic: boolean;
  publishPending: boolean;
  hasSavedLinks: boolean;
  onPublicationChange: (published: boolean) => void;
}

export function ConnectCard({
  configuredNetworks,
  cardUrl,
  isPublic,
  publishPending,
  hasSavedLinks,
  onPublicationChange,
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
          <Chip variant={isPublic ? "primary" : "soft"} size="sm">
            {isPublic ? "Shared" : "Private"}
          </Chip>

          {hasSavedLinks && cardUrl ? (
            <div
              className="border-border mt-4 w-fit rounded-2xl border p-4"
              style={{ backgroundColor: QR_BACKGROUND }}
            >
              <QRCodeSVG
                value={cardUrl}
                size={220}
                fgColor={QR_FOREGROUND}
                bgColor={QR_BACKGROUND}
              />
            </div>
          ) : (
            <div className="border-border mt-4 flex size-[220px] items-center justify-center rounded-2xl border border-dashed">
              <div className="flex flex-col items-center gap-2 px-6">
                <QrCode className="size-6" aria-hidden />
                <Typography type="body-sm" color="muted">
                  Save a profile to create your networking code.
                </Typography>
              </div>
            </div>
          )}

          <Typography type="body-xs" color="muted" className="mt-3">
            {isPublic
              ? "Scan to open all of my shared profiles"
              : "This code stays the same. Scans are unavailable while private."}
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

        <Switch
          className="w-full"
          isSelected={isPublic}
          isDisabled={!hasSavedLinks || publishPending}
          aria-label="Share my networking card"
          onChange={onPublicationChange}
        >
          <Switch.Content className="w-full justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Share my card
              </span>
              <span className="block text-xs font-normal text-muted">
                {hasSavedLinks
                  ? "Anyone with your code can open it."
                  : "Add at least one profile in Settings first."}
              </span>
            </span>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
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
