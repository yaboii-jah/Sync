"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Switch,
  Typography,
} from "@heroui/react";
import { Download, QrCode } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { setCardPublic } from "@/app/(app)/connect/actions";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_NETWORKS, SOCIAL_SPECS, type SocialLinks } from "@/lib/social";

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
   * What the QR encodes — the card's public token, not a social URL.
   *
   * The token is what lets the card change without reprinting the code: an
   * attendee can add a link, swap one, or withdraw the card entirely and the
   * same QR keeps resolving to whatever they currently publish.
   */
  qrValue: string;
  links: SocialLinks;
  isPublic: boolean;
}

export function ConnectCard({
  name,
  photoUrl,
  qrValue,
  links,
  isPublic,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [published, setPublished] = useState(isPublic);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const presentNetworks = SOCIAL_NETWORKS.filter((network) => links[network]);

  function togglePublished() {
    const next = !published;

    // Moved first so the switch answers the tap; the server result below is
    // what it settles on.
    setPublished(next);
    setError(null);

    startTransition(async () => {
      const result = await setCardPublic(next);

      if (result.error) {
        setPublished(!next);
        setError(result.error);
      }
    });
  }

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sync-networking-qr.png";
    link.click();
  }

  return (
    <Card>
      <Card.Content className="flex flex-col items-center gap-1 py-8 text-center">
        <Avatar size="lg" className="size-20">
          {photoUrl ? (
            <Avatar.Image asChild src={photoUrl}>
              <Image src={photoUrl} alt="" width={80} height={80} unoptimized />
            </Avatar.Image>
          ) : null}
          <Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
        </Avatar>

        <Typography type="h5" className="mt-4">
          {name}
        </Typography>
        <Typography type="body-sm" color="muted">
          {published
            ? "Show this code. It opens your card."
            : "Your card is hidden. Turn it on to share."}
        </Typography>

        <div
          className="border-border mt-6 w-fit rounded-2xl border p-4"
          style={{ backgroundColor: QR_BACKGROUND }}
        >
          {published ? (
            <QRCodeSVG
              value={qrValue}
              size={220}
              fgColor={QR_FOREGROUND}
              bgColor={QR_BACKGROUND}
            />
          ) : (
            /*
             * A hidden card's code resolves to nothing, so rendering it would
             * invite a scan that silently fails. The placeholder keeps the
             * card's shape — and the page's height — while it is off.
             */
            <div
              className="flex size-[220px] flex-col items-center justify-center gap-2"
              style={{ color: QR_FOREGROUND }}
            >
              <QrCode className="size-8 opacity-40" aria-hidden />
              <span className="text-xs opacity-60">Card hidden</span>
            </div>
          )}
        </div>

        <Typography type="body-xs" color="muted" className="mt-3">
          Scan to open my card
        </Typography>
      </Card.Content>

      <Card.Footer className="flex flex-col gap-3">
        <div className="flex w-full items-center justify-between gap-4">
          <Typography type="body-sm">Share my card</Typography>
          <Switch
            isSelected={published}
            isDisabled={pending}
            aria-label="Share my networking card"
            onChange={togglePublished}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </div>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {presentNetworks.length > 0 ? (
          /*
           * One row rather than a stack. These are a preview of what a scanner
           * gets, not the page's job — three full-width buttons pushed the QR
           * itself off a 390px screen.
           */
          <div className="flex w-full gap-2">
            {presentNetworks.map((network) => (
              <a
                key={network}
                href={links[network]}
                target="_blank"
                rel="noopener noreferrer"
                className={`${secondaryLinkClass} min-w-0 flex-1`}
              >
                {SOCIAL_SPECS[network].label}
              </a>
            ))}
          </div>
        ) : (
          <Typography type="body-xs" color="muted">
            Add a LinkedIn, Instagram or Facebook link in Settings, then turn
            your card on.
          </Typography>
        )}

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
