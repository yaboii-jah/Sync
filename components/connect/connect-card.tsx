"use client";

import Image from "next/image";
import { useRef } from "react";
import { Download, ExternalLink } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

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
    <div className="rounded-2xl border border-border-default bg-bg-base px-6 py-8 text-center">
      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-border-default">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-surface font-display text-3xl text-text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-bold text-text-primary">{name}</h2>
      <p className="mt-1 text-sm text-text-muted">
        Show this code. No setup needed.
      </p>

      <div className="mx-auto mt-6 w-fit rounded-2xl border border-border-default bg-pastel-yellow p-4 shadow-[0_0_24px_rgba(188,131,48,0.25)]">
        <QRCodeSVG
          value={qrValue}
          size={220}
          fgColor="#024056"
          bgColor="#E6FFC9"
        />
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Scan to open my card
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
          Open my LinkedIn
        </a>
        <button
          type="button"
          onClick={saveQr}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-accent-primary/30 active:scale-95"
        >
          <Download className="h-4 w-4" />
          Save QR
        </button>
      </div>

      <div ref={canvasWrapRef} aria-hidden className="hidden">
        <QRCodeCanvas value={qrValue} size={512} fgColor="#024056" bgColor="#FFFFFF" />
      </div>
    </div>
  );
}
