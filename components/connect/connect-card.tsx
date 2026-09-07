"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, Chip, Label, Separator, Typography } from "@/components/ui";
import { Download } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { NetworkCard } from "@/components/network-card";
import { secondaryLinkClass } from "@/components/ui/link-button";
import { SOCIAL_SPECS, type SocialLinks, type SocialNetwork } from "@/lib/social";
import { createClient } from "@/lib/supabase/client";
import type { NetworkCardTemplate } from "@/lib/supabase/queries/networking";

const QR_FOREGROUND = "#024056";
const QR_BACKGROUND = "#FFFFFF";

const TEMPLATE_OPTIONS: { value: NetworkCardTemplate; label: string }[] = [
  { value: 1, label: "Solid — Default" },
  { value: 2, label: "Glass — Atmospheric" },
  { value: 3, label: "Crystal Outline — Artistic" },
  { value: 4, label: "Event — Featured" },
];

interface ConnectCardProps {
  name: string;
  photoUrl: string | null;
  links: SocialLinks;
  configuredNetworks: SocialNetwork[];
  cardUrl: string;
  hasSavedLinks: boolean;
  initialTemplate: NetworkCardTemplate;
}

export function ConnectCard({
  name,
  photoUrl,
  links,
  configuredNetworks,
  cardUrl,
  hasSavedLinks,
  initialTemplate,
}: ConnectCardProps) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<NetworkCardTemplate>(initialTemplate);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  function saveQr() {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sync-networking-card-qr.png";
    link.click();
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

        <div className="overflow-hidden rounded-2xl border border-border">
          <NetworkCard variant={template} name={name} photoUrl={photoUrl} links={links} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="network-template">Card template</Label>
          <select
            id="network-template"
            value={template}
            disabled={!hasSavedLinks || savingTemplate}
            onChange={async (e) => {
              const next = Number(e.target.value) as NetworkCardTemplate;
              setTemplate(next);
              setTemplateError(null);
              if (!hasSavedLinks) return;
              setSavingTemplate(true);
              const supabase = createClient();
              const { error } = await supabase.rpc("set_networking_card_template", { p_template: next });
              if (error) {
                setTemplateError("Could not save template. Please try again.");
                setTemplate(initialTemplate);
              }
              setSavingTemplate(false);
            }}
            className="w-full rounded-lg border border-border bg-field-background px-3 py-2.5 text-sm text-field-foreground outline-none focus:border-focus focus:ring-2 focus:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {templateError ? (
            <Typography type="body-xs" className="text-danger">
              {templateError}
            </Typography>
          ) : savingTemplate ? (
            <Typography type="body-xs" color="muted">
              Saving…
            </Typography>
          ) : !hasSavedLinks ? (
            <Typography type="body-xs" color="muted">
              Add a profile to enable templates.
            </Typography>
          ) : null}
        </div>

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
