import sharp from "sharp";
import { fileURLToPath } from "node:url";

const WIDTH = 1080;
const HEIGHT = 1920;
const source = fileURLToPath(new URL("../public/new-assets/SS2026 Photobooth Frame.png", import.meta.url));
const output = fileURLToPath(new URL("../public/assets/south-summit-sue-frame.png", import.meta.url));

// Preserve the complete supplied artwork and its alpha windows. Preview and canvas
// use the same full-frame dimensions; no cropping or reconstructed mascot layers.
await sharp(source)
  .resize(WIDTH, HEIGHT, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log("Generated the supplied Sue frame at 1080×1920 with transparent photo windows.");
