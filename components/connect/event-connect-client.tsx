"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Alert, Button, Card, Typography } from "@/components/ui";
import { NetworkCard } from "@/components/network-card";
import { QrScanner } from "@/components/connect/qr-scanner";
import { SOCIAL_NETWORKS, SOCIAL_SPECS } from "@/lib/social";
import type { EventNetworkingCard } from "@/lib/supabase/queries/event-networking";
import { saveEventCardAction, saveReusableLinksAction } from "@/app/e/[slug]/connect/actions";

export function EventConnectClient({ slug, name, photoUrl, cardUrl, card, archived }: {
  slug: string; name: string; photoUrl: string | null; cardUrl: string;
  card: EventNetworkingCard | null; archived: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(SOCIAL_NETWORKS.filter((network) => card?.links[network]));
  const [template, setTemplate] = useState(card?.template ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [linksSaved, setLinksSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sharedLinks = Object.fromEntries(selected.filter((network) => card?.available[network as keyof typeof card.available]).map((network) => [network, card?.available[network as keyof typeof card.available]]));
  const published = Object.keys(card?.links ?? {}).length > 0;

  function downloadQr() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `sync-${slug}-networking-qr.png`;
    anchor.click();
  }

  return <div className="grid gap-6 lg:grid-cols-2">
    <div className="space-y-6">
      {!archived ? <QrScanner eventSlug={slug} /> : null}
      <Card><Card.Content className="gap-5">
        <Typography type="h6">My event card</Typography>
        {card && published ? <>
          <div className="mx-auto rounded-xl bg-white p-4 w-fit"><QRCodeSVG value={cardUrl} size={220} /></div>
          <Button variant="secondary" fullWidth onPress={downloadQr}>Save QR</Button>
          <div ref={canvasRef} className="hidden" aria-hidden><QRCodeCanvas value={cardUrl} size={512} marginSize={4} /></div>
        </> : <Typography type="body-sm" color="muted">Choose at least one saved social link to activate your event QR.</Typography>}
        <div className="overflow-hidden rounded-xl"><NetworkCard variant={template} name={name} photoUrl={photoUrl} links={sharedLinks} eventNeutral /></div>
      </Card.Content></Card>
    </div>
    <Card><Card.Content className="gap-5">
      <div><Typography type="h6">Shared in this event</Typography><Typography type="body-sm" color="muted">Only active members of this event can open your card. Your account links can be reused in other events, but are never selected automatically.</Typography></div>
      {archived ? <Typography type="body-sm" color="muted">This event is archived. Your card is read-only.</Typography> : <>
        <div className="space-y-3">{SOCIAL_NETWORKS.map((network) => <label key={network} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
          <input type="checkbox" checked={selected.includes(network)} disabled={!card?.available[network]} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, network] : previous.filter((value) => value !== network))} />
          <span>{SOCIAL_SPECS[network].label}</span>{!card?.available[network] ? <span className="text-muted">Not saved</span> : null}
        </label>)}</div>
        <label className="flex flex-col gap-2 text-sm">Card template
          <select value={template} onChange={(event) => setTemplate(Number(event.target.value) as 1 | 2 | 3 | 4)} className="rounded-lg border border-border bg-field-background px-3 py-2 text-field-foreground">
            <option value={1}>Solid</option><option value={2}>Glass</option><option value={3}>Crystal</option><option value={4}>Event</option>
          </select>
        </label>
        {error ? <Alert status="danger"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
        {saved ? <Typography type="body-sm">Saved. Your event card is updated.</Typography> : null}
        <Button isDisabled={pending} onPress={() => {
          const form = new FormData();
          for (const network of selected) form.append("network", network);
          form.set("template", String(template));
          startTransition(async () => {
            const result = await saveEventCardAction(slug, form);
            setError(result.error);
            setSaved(!result.error);
          });
        }}>Save event card</Button>
      </>}
      {!archived ? <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium">Edit reusable social links</summary>
        <Typography type="body-sm" color="muted" className="mt-3">These URLs belong to your account. Removing one also removes it from every event card where you selected it.</Typography>
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setLinksSaved(false);
          startTransition(async () => {
            const result = await saveReusableLinksAction(slug, form);
            setError(result.error);
            setLinksSaved(!result.error);
            if (!result.error) {
              setSelected((previous) => previous.filter((network) => String(form.get(network) ?? "").trim() !== ""));
            }
          });
        }}>
          {SOCIAL_NETWORKS.map((network) => <label key={network} className="flex flex-col gap-1 text-sm">
            {SOCIAL_SPECS[network].label}
            <input name={network} type="url" defaultValue={card?.available[network] ?? ""} placeholder={SOCIAL_SPECS[network].placeholder}
              className="w-full rounded-lg border border-border bg-field-background px-3 py-2 text-field-foreground" />
          </label>)}
          {linksSaved ? <Typography type="body-sm">Reusable links saved. Choose which ones to share above.</Typography> : null}
          <Button type="submit" variant="secondary" isDisabled={pending}>Save reusable links</Button>
        </form>
      </details> : null}
      <Link className="platform-link text-sm" href="/settings">Account Settings</Link>
    </Card.Content></Card>
  </div>;
}
