"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  TextField,
  Typography,
} from "@heroui/react";
import { Download, ExternalLink } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { primaryLinkClass } from "@/components/ui/link-button";
import type { PlatformConfig } from "@/lib/platforms";
import { isValidPlatformUrl } from "@/lib/platforms";

/*
 * The QR tile keeps a fixed light ground in both themes. Scanners need a light
 * background and dark modules, so this is a functional constant, not a colour
 * choice: near-black modules on white.
 */
const QR_FOREGROUND = "#171717";
const QR_BACKGROUND = "#FFFFFF";

interface ConnectCardProps {
  name: string;
  photoUrl: string | null;
  platform: PlatformConfig;
  url: string;
  onUrlChange: (url: string) => void;
  qrValue: string | null;
  onGenerateQr: () => void;
  isSaving?: boolean;
}

export function ConnectCard({
  name,
  photoUrl,
  platform,
  url,
  onUrlChange,
  qrValue,
  onGenerateQr,
  isSaving = false,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  function handleGenerateQr() {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("URL cannot be empty.");
      return;
    }
    if (!isValidPlatformUrl(platform.id, trimmed)) {
      setUrlError(`Enter a valid ${platform.name} profile URL.`);
      return;
    }
    setUrlError(null);
    onGenerateQr();
  }

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `sync-${platform.id}-qr.png`;
    link.click();
  }

  return (
    <Card>
      <Card.Content className="flex flex-col items-center gap-1 py-8 text-center">
        <Avatar size="lg" className="size-20">
          {photoUrl ? (
            <Avatar.Image asChild src={photoUrl}>
              <Image
                src={photoUrl}
                alt=""
                width={80}
                height={80}
                unoptimized
              />
            </Avatar.Image>
          ) : null}
          <Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
        </Avatar>

        <Typography type="h5" className="mt-4">
          {name}
        </Typography>
        <Typography type="body-sm" color="muted">
          Show your {platform.name} code.
        </Typography>

        <div className="mt-6 w-full px-4">
          <TextField fullWidth>
            <Label>{platform.name} profile URL</Label>
            <Input
              variant="secondary"
              placeholder={platform.urlPlaceholder}
              value={url}
              onChange={(e) => {
                onUrlChange(e.target.value);
                if (urlError) setUrlError(null);
              }}
            />
            {urlError ? <FieldError>{urlError}</FieldError> : null}
          </TextField>
        </div>

        {qrValue ? (
          <div
            className="border-border mt-6 w-fit rounded-2xl border p-4"
            style={{ backgroundColor: QR_BACKGROUND }}
          >
            <QRCodeSVG
              value={qrValue}
              size={220}
              fgColor={QR_FOREGROUND}
              bgColor={QR_BACKGROUND}
            />
          </div>
        ) : (
          <div className="border-border mt-6 flex size-[220px] items-center justify-center rounded-2xl border border-dashed">
            <Typography type="body-sm" color="muted">
              Enter a URL and generate a QR code
            </Typography>
          </div>
        )}

        <Typography type="body-xs" color="muted" className="mt-3">
          {qrValue ? "Scan to open my profile" : "QR code will appear here"}
        </Typography>
      </Card.Content>

      <Card.Footer className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          isDisabled={!url.trim() || isSaving}
          isPending={isSaving}
          onPress={handleGenerateQr}
        >
          Generate QR
        </Button>
        <a
          href={url.trim() || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`${primaryLinkClass} w-full ${!url.trim() ? "pointer-events-none opacity-50" : ""}`}
        >
          <ExternalLink className="size-4" aria-hidden />
          {platform.openButtonLabel}
        </a>
        <Button
          variant="secondary"
          fullWidth
          isDisabled={!qrValue}
          onPress={saveQr}
        >
          <Download className="size-4" aria-hidden />
          Save QR
        </Button>
      </Card.Footer>

      <div ref={canvasWrapRef} aria-hidden className="hidden">
        {qrValue ? (
          <QRCodeCanvas
            value={qrValue}
            size={512}
            fgColor={QR_FOREGROUND}
            bgColor={QR_BACKGROUND}
          />
        ) : null}
      </div>
    </Card>
  );
}
