import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  brandingInputError,
  eventBrandingDeliveryPath,
  eventBrandingPublicUrl,
  eventBrandingStagingPath,
  isExpectedBrandingStagingPath,
} from "./branding";
import { normalizeEventBrandingImage } from "./branding-image";

describe("event branding", () => {
  const eventId = "e6100000-0000-4000-8000-000000000001";
  const userId = "61000000-0000-4000-8000-000000000001";
  const fileId = "71000000-0000-4000-8000-000000000001";

  afterEach(() => vi.unstubAllEnvs());

  it("validates input size and public MIME type", () => {
    expect(brandingInputError({ size: 100, type: "image/png" })).toBeNull();
    expect(brandingInputError({ size: 0, type: "image/png" })).toContain("non-empty");
    expect(brandingInputError({ size: 10 * 1024 * 1024 + 1, type: "image/png" })).toContain("10 MB");
    expect(brandingInputError({ size: 100, type: "image/svg+xml" })).toContain("JPEG");
  });

  it("builds tenant and user-scoped immutable paths", () => {
    const staging = eventBrandingStagingPath(eventId, userId, fileId, "image/png");
    expect(isExpectedBrandingStagingPath(staging, eventId, userId)).toBe(true);
    expect(isExpectedBrandingStagingPath(staging, eventId, "62000000-0000-4000-8000-000000000001")).toBe(false);
    expect(eventBrandingDeliveryPath(eventId, "cover", fileId)).toBe(`events/${eventId}/branding/cover/${fileId}.webp`);
  });

  it("builds a public Storage URL without accepting a full external URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:45421");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    expect(eventBrandingPublicUrl(null)).toBeNull();
    expect(eventBrandingPublicUrl(`events/${eventId}/branding/logo/${fileId}.webp`)).toContain(`/storage/v1/object/public/event-branding/events/${eventId}/branding/logo/${fileId}.webp`);
  });

  it("normalizes accepted images and rejects unreadable input", async () => {
    const input = await sharp({ create: { width: 900, height: 500, channels: 4, background: "#0b766e" } }).png().toBuffer();
    const logo = await normalizeEventBrandingImage(input, "logo");
    const cover = await normalizeEventBrandingImage(input, "cover");
    await expect(sharp(logo).metadata()).resolves.toMatchObject({ format: "webp", width: 512, height: 512 });
    await expect(sharp(cover).metadata()).resolves.toMatchObject({ format: "webp", width: 900, height: 500 });
    await expect(normalizeEventBrandingImage(Buffer.from("not an image"), "logo")).rejects.toThrow("unreadable");
  });
});
