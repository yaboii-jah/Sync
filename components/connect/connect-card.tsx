"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useTransition } from "react";
import { ChevronDown, Download, ExternalLink, QrCode } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  SOCIAL_PLATFORMS,
  isValidSocialUrl,
  type SocialPlatform,
} from "@/lib/social-platforms";
import { upsertSocialProfile } from "@/app/(app)/connect/actions";

interface SocialConnectCardProps {
  name: string;
  photoUrl: string | null;
  savedUrls: Record<string, string>;
}

interface PlatformState {
  url: string;
  qrValue: string | null;
}

export function SocialConnectCard({
  name,
  photoUrl,
  savedUrls,
}: SocialConnectCardProps) {
  const [selectedId, setSelectedId] = useState<string>(SOCIAL_PLATFORMS[0].id);
  const [platformStates, setPlatformStates] = useState<
    Record<string, PlatformState>
  >(() =>
    Object.fromEntries(
      SOCIAL_PLATFORMS.map((p) => [
        p.id,
        {
          url: savedUrls[p.id] ?? "",
          qrValue: savedUrls[p.id] ?? null,
        },
      ]),
    ),
  );

  const [saving, startTransition] = useTransition();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const platform =
    SOCIAL_PLATFORMS.find((p) => p.id === selectedId) ?? SOCIAL_PLATFORMS[0];
  const state = platformStates[selectedId];
  const hasQr = state.qrValue !== null;
  const canOpen = isValidSocialUrl(platform, state.url);

  const setUrl = useCallback(
    (url: string) =>
      setPlatformStates((prev) => ({
        ...prev,
        [selectedId]: { ...prev[selectedId], url },
      })),
    [selectedId],
  );

  const generateQr = useCallback(() => {
    if (!canOpen || saving) return;
    const trimmed = state.url.trim();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("network", selectedId);
      formData.set("url", trimmed);

      const result = await upsertSocialProfile(
        { error: null, success: false },
        formData,
      );

      if (result.success) {
        setPlatformStates((prev) => ({
          ...prev,
          [selectedId]: { ...prev[selectedId], qrValue: trimmed },
        }));
      }
    });
  }, [canOpen, saving, selectedId, state.url]);

  const saveQr = useCallback(() => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `sync-${platform.id}-qr.png`;
    link.click();
  }, [platform.id]);

  return (
    <div className="rounded-2xl border border-border-default bg-bg-base px-6 py-8 text-center">
      {/* Platform dropdown */}
      <div className="mb-6">
        <label htmlFor="platform-select" className="sr-only">
          Social platform
        </label>
        <div className="relative inline-block">
          <select
            id="platform-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="appearance-none rounded-full border border-border-default bg-bg-base px-4 py-2 pr-10 text-sm font-bold text-text-primary uppercase transition-all hover:bg-accent-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-pastel-yellow"
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      {/* Avatar */}
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

      {/* Name */}
      <h2 className="mt-4 text-xl font-bold text-text-primary">{name}</h2>
      <p className="mt-1 text-sm text-text-muted">
        {hasQr
          ? "Show this code. No setup needed."
          : `Enter your ${platform.name} URL to generate a QR.`}
      </p>

      {/* QR section */}
      <div className="mx-auto mt-6 w-fit rounded-2xl border border-border-default bg-pastel-yellow p-4 shadow-[0_0_24px_rgba(188,131,48,0.25)]">
        {hasQr ? (
          <QRCodeSVG
            value={state.qrValue!}
            size={220}
            fgColor="#024056"
            bgColor="#E6FFC9"
          />
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center">
            <QrCode className="h-16 w-16 text-charcoal/30" />
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {hasQr ? "Scan to open my profile" : "QR preview"}
      </p>

      {/* URL input */}
      <div className="mt-6">
        <label htmlFor="profile-url" className="sr-only">
          {platform.name} profile URL
        </label>
        <input
          id="profile-url"
          type="url"
          value={state.url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={platform.placeholder}
          className="w-full rounded-full border border-border-default bg-bg-base px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pastel-yellow"
        />
      </div>

      {/* Generate QR */}
      <button
        type="button"
        onClick={generateQr}
        disabled={!canOpen || saving}
        className="mt-3 w-full rounded-full bg-accent-primary px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-light-green hover:text-charcoal active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent-primary disabled:hover:text-text-primary"
      >
        {saving ? "Saving..." : "Generate QR"}
      </button>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        <a
          href={canOpen ? state.url.trim() : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canOpen}
          onClick={(e) => {
            if (!canOpen) e.preventDefault();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-pastel-yellow px-5 py-3 text-xs font-bold tracking-[0.14em] text-charcoal uppercase transition-all hover:bg-light-green active:scale-95 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-pastel-yellow"
        >
          <ExternalLink className="h-4 w-4" />
          {platform.openButton}
        </a>
        <button
          type="button"
          onClick={saveQr}
          disabled={!hasQr}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border-default px-5 py-3 text-xs font-bold tracking-[0.14em] text-text-primary uppercase transition-all hover:bg-accent-primary/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Download className="h-4 w-4" />
          Save QR
        </button>
      </div>

      {/* Hidden canvas for PNG download */}
      <div ref={canvasWrapRef} aria-hidden className="hidden">
        {hasQr && (
          <QRCodeCanvas
            value={state.qrValue!}
            size={512}
            fgColor="#024056"
            bgColor="#FFFFFF"
          />
        )}
      </div>
    </div>
  );
}
