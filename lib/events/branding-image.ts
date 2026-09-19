import sharp from "sharp";
import type { EventBrandingKind } from "./branding";

const MAX_INPUT_PIXELS = 40_000_000;
const DELIVERY_MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function normalizeEventBrandingImage(input: Buffer, kind: EventBrandingKind): Promise<Buffer> {
  let source: ReturnType<typeof sharp>;
  try {
    source = sharp(input, { animated: false, failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS }).rotate();
    const metadata = await source.metadata();
    if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) throw new Error("unsupported image format");
    if (!metadata.width || !metadata.height || metadata.pages && metadata.pages > 1) throw new Error("invalid image dimensions");
  } catch {
    throw new Error("The image is unreadable, animated, or uses an unsupported format.");
  }

  try {
    const resized = kind === "logo"
      ? source.resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      : source.resize(1600, 900, { fit: "inside", withoutEnlargement: true });
    let output = await resized.webp({ quality: 82, alphaQuality: 90, smartSubsample: true }).toBuffer();
    if (output.length > DELIVERY_MAX_BYTES) {
      output = await (kind === "logo"
        ? sharp(input, { animated: false, limitInputPixels: MAX_INPUT_PIXELS }).rotate().resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        : sharp(input, { animated: false, limitInputPixels: MAX_INPUT_PIXELS }).rotate().resize(1600, 900, { fit: "inside", withoutEnlargement: true }))
        .webp({ quality: 68, alphaQuality: 80, smartSubsample: true }).toBuffer();
    }
    if (output.length > DELIVERY_MAX_BYTES) throw new Error("The normalized image is still too large. Choose a less detailed image.");
    return output;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The normalized")) throw error;
    throw new Error("The image could not be processed. Choose another JPEG, PNG, or WebP image.");
  }
}
