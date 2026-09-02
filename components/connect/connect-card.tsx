"use client";

import Image from "next/image";
import { useRef } from "react";
import { Avatar, Button, Card, Typography } from "@heroui/react";
import { Download, ExternalLink } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { primaryLinkClass } from "@/components/ui/link-button";

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
  /**
   * What the QR encodes — a Sync scan URL, not a LinkedIn one.
   *
   * This is the whole reason the code can exist from first sign-in. Encoding
   * the LinkedIn URL meant the URL had to be typed before a QR could render;
   * encoding a Sync URL means the scan resolves against data the LinkedIn
   * sign-in already provided.
   */
  qrValue: string;
  /** Where "Open my LinkedIn" points. Separate from the QR by design. */
  linkedinUrl: string;
}

export function ConnectCard({
  name,
  photoUrl,
  qrValue,
  linkedinUrl,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sync-linkedin-qr.png";
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
          Show this code. No setup needed.
        </Typography>

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

        <Typography type="body-xs" color="muted" className="mt-3">
          Scan to open my card
        </Typography>
      </Card.Content>

      <Card.Footer className="flex flex-col gap-3">
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${primaryLinkClass} w-full`}
        >
          <ExternalLink className="size-4" aria-hidden />
          Open my LinkedIn
        </a>
        <Button variant="secondary" fullWidth onPress={saveQr}>
          <Download className="size-4" aria-hidden />
          Save QR
        </Button>
      </Card.Footer>

      <div ref={canvasWrapRef} aria-hidden className="hidden">
        <QRCodeCanvas
          value={qrValue}
          size={512}
          fgColor={QR_FOREGROUND}
          bgColor={QR_BACKGROUND}
        />
      </div>
    </Card>
  );
}
