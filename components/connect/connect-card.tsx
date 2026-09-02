"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, Eye, EyeOff } from "lucide-react";
import { useRef } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

interface ConnectCardProps {
  name: string;
  photoUrl: string | null;
  publicCardUrl: string;
  isPublic: boolean;
  hasLinks: boolean;
}

export function ConnectCard({
  name,
  photoUrl,
  publicCardUrl,
  isPublic,
  hasLinks,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sync-connect-qr.png";
    link.click();
  }

  return (
    <section className="rounded-2xl border border-border-default bg-bg-base px-6 py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
        {isPublic ? (
          <span className="flex items-center gap-2 text-state-success">
            <Eye className="h-4 w-4" /> Public
          </span>
        ) : (
          <span className="flex items-center gap-2 text-text-muted">
            <EyeOff className="h-4 w-4" /> Private
          </span>
        )}
      </div>

      <div className="mx-auto mt-4 h-20 w-20 overflow-hidden rounded-full border-2 border-border-default">
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
        One code for every social profile you choose.
      </p>

      <div className="mx-auto mt-6 w-fit rounded-2xl border border-border-default bg-pastel-yellow p-4 shadow-[0_0_24px_rgba(188,131,48,0.25)]">
        <QRCodeSVG
          value={publicCardUrl}
          size={220}
          fgColor="#024056"
          bgColor="#E6FFC9"
        />
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {isPublic
          ? "Scan to choose a social network"
          : hasLinks
            ? "Publish below before sharing this code"
            : "Add a social profile to activate this code"}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {isPublic ? (
          <Link
            href={publicCardUrl}
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green active:scale-95"
          >
            <Eye className="h-4 w-4" /> Preview public card
          </Link>
        ) : null}
        <button
          type="button"
          onClick={saveQr}
          disabled={!hasLinks}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-accent-primary/30 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
        >
          <Download className="h-4 w-4" /> Save QR
        </button>
      </div>

      <div ref={canvasWrapRef} aria-hidden className="hidden">
        <QRCodeCanvas
          value={publicCardUrl}
          size={512}
          fgColor="#024056"
          bgColor="#E6FFC9"
        />
      </div>
    </section>
  );
}
