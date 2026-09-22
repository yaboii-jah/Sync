import { getSupabaseEnv } from "@/lib/supabase/env";

export const EVENT_BRANDING_STAGING_BUCKET = "event-branding-staging";
export const EVENT_BRANDING_BUCKET = "event-branding";
export const EVENT_BRANDING_MAX_BYTES = 10 * 1024 * 1024;
export const EVENT_BRANDING_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const EVENT_BRANDING_KINDS = ["logo", "cover"] as const;

export type EventBrandingKind = (typeof EVENT_BRANDING_KINDS)[number];

export interface BrandingActionResult {
  error?: string;
  path?: string | null;
}

const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function isEventBrandingKind(value: string): value is EventBrandingKind {
  return (EVENT_BRANDING_KINDS as readonly string[]).includes(value);
}

export function brandingInputError(file: Pick<File, "size" | "type">, maxBytes = EVENT_BRANDING_MAX_BYTES): string | null {
  if (file.size < 1) return "Choose a non-empty image.";
  if (file.size > maxBytes) return `Choose an image no larger than ${Math.floor(maxBytes / 1048576)} MiB.`;
  if (!(EVENT_BRANDING_MIME_TYPES as readonly string[]).includes(file.type)) return "Use a JPEG, PNG, or WebP image.";
  return null;
}

export function eventBrandingStagingPath(eventId: string, userId: string, fileId: string, mimeType: string): string {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `events/${eventId}/branding/staging/${userId}/${fileId}.${extension}`;
}

export function isExpectedBrandingStagingPath(path: string, eventId: string, userId: string): boolean {
  return new RegExp(`^events/${eventId}/branding/staging/${userId}/${UUID_V4}\\.(jpg|jpeg|png|webp)$`, "i").test(path);
}

export function eventBrandingDeliveryPath(eventId: string, kind: EventBrandingKind, fileId: string): string {
  return `events/${eventId}/branding/${kind}/${fileId}.webp`;
}

export function eventBrandingPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${getSupabaseEnv().url}/storage/v1/object/public/${EVENT_BRANDING_BUCKET}/${encodedPath}`;
}
