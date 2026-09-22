"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ChangeEvent } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { processEventBrandingAction, removeEventBrandingAction } from "@/app/manage/actions";
import { Alert, Button, Card } from "@/components/ui";
import { useToast } from "@/components/toast/toast-provider";
import {
  EVENT_BRANDING_STAGING_BUCKET,
  brandingInputError,
  eventBrandingPublicUrl,
  eventBrandingStagingPath,
  type EventBrandingKind,
} from "@/lib/events/branding";
import { createClient } from "@/lib/supabase/client";

interface BrandingManagerProps {
  slug: string;
  eventId: string;
  userId: string;
  logoPath: string | null;
  coverPath: string | null;
  readOnly: boolean;
  maxUploadBytes: number;
}

const descriptions: Record<EventBrandingKind, { title: string; help: string }> = {
  logo: { title: "Event logo", help: "Use a square image. It is fitted inside a 512 × 512 transparent canvas." },
  cover: { title: "Cover image", help: "Use a wide image. It is resized to fit within 1600 × 900 without cropping." },
};

export function BrandingManager(props: BrandingManagerProps) {
  const [paths, setPaths] = useState({ logo: props.logoPath, cover: props.coverPath });
  const [active, setActive] = useState<EventBrandingKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  async function upload(kind: EventBrandingKind, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const inputError = brandingInputError(file, props.maxUploadBytes);
    if (inputError) return setError(inputError);

    setError(null);
    setActive(kind);
    const stagingPath = eventBrandingStagingPath(props.eventId, props.userId, crypto.randomUUID(), file.type);
    const supabase = createClient();
    const uploaded = await supabase.storage.from(EVENT_BRANDING_STAGING_BUCKET).upload(stagingPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) {
      console.error("branding staging upload failed", { code: uploaded.error.statusCode ?? "unknown" });
      setError("The image could not be uploaded. Retry, or choose another image.");
      setActive(null);
      return;
    }

    startTransition(async () => {
      const result = await processEventBrandingAction({ slug: props.slug, kind, stagingPath, requestId: crypto.randomUUID() });
      if (result.error) {
        await supabase.storage.from(EVENT_BRANDING_STAGING_BUCKET).remove([stagingPath]);
        setError(result.error);
      } else {
        setPaths((current) => ({ ...current, [kind]: result.path ?? null }));
        toast(`${descriptions[kind].title} saved`);
        router.refresh();
      }
      setActive(null);
    });
  }

  function remove(kind: EventBrandingKind) {
    setError(null);
    setActive(kind);
    startTransition(async () => {
      const result = await removeEventBrandingAction({ slug: props.slug, kind, requestId: crypto.randomUUID() });
      if (result.error) setError(result.error);
      else {
        setPaths((current) => ({ ...current, [kind]: null }));
        toast(`${descriptions[kind].title} removed`);
        router.refresh();
      }
      setActive(null);
    });
  }

  return <section>
    <h2 className="text-2xl font-bold tracking-tight">Branding</h2>
    <p className="mt-2 max-w-2xl leading-7 text-muted">Add event-specific artwork for the public page and attendee experience. JPEG, PNG, and WebP files up to {Math.floor(props.maxUploadBytes / 1048576)} MiB are accepted.</p>
    {props.readOnly ? <Alert status="warning" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>This event is read-only. Existing artwork remains visible.</Alert.Description></Alert.Content></Alert> : null}
    {error ? <Alert status="danger" className="mt-5"><Alert.Indicator /><Alert.Content><Alert.Description>{error}</Alert.Description></Alert.Content></Alert> : null}
    <div className="mt-8 grid gap-5 xl:grid-cols-2">
      {(["logo", "cover"] as const).map((kind) => {
        const path = paths[kind];
        const url = eventBrandingPublicUrl(path);
        const isBusy = (pending || active !== null) && active === kind;
        return <Card key={kind} variant="secondary"><Card.Content className="gap-4">
          <div><h3 className="font-semibold">{descriptions[kind].title}</h3><p className="mt-1 text-sm leading-6 text-muted">{descriptions[kind].help}</p></div>
          <div className={`relative overflow-hidden rounded-xl border bg-default platform-rule ${kind === "logo" ? "aspect-square max-w-56" : "aspect-video w-full"}`}>
            {url ? <Image src={url} alt={`${descriptions[kind].title} preview`} fill sizes={kind === "logo" ? "224px" : "(min-width: 1280px) 40vw, 90vw"} className="object-contain" unoptimized /> : <div className="flex h-full items-center justify-center"><ImageIcon className="size-9 text-muted" aria-hidden /><span className="sr-only">No image uploaded</span></div>}
          </div>
          {!props.readOnly ? <div className="flex flex-wrap gap-2">
            <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition hover:brightness-105 ${active !== null ? "pointer-events-none opacity-50" : ""}`}>
              <Upload className="size-4" aria-hidden />{isBusy ? "Processing…" : path ? "Replace image" : "Upload image"}
              <input data-branding-kind={kind} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={active !== null} onChange={(event) => void upload(kind, event)} />
            </label>
            {path ? <Button size="sm" variant="ghost" isDisabled={active !== null} onPress={() => remove(kind)}><Trash2 className="size-4" aria-hidden />Remove</Button> : null}
          </div> : null}
        </Card.Content></Card>;
      })}
    </div>
  </section>;
}
