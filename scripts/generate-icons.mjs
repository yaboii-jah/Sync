import sharp from "sharp";
import { ART, EVENT_NAME, eventLogo, gridSvg, wordmark } from "./event-art.mjs";

async function paddedLogo(size, ratio = 0.78) {
  return sharp({ create: { width: size, height: size, channels: 4, background: ART.paper } })
    .composite([{ input: await eventLogo(Math.round(size * ratio)), gravity: "center" }]).png().toBuffer();
}
async function save(input, path) { await sharp(await input).png({ compressionLevel: 9 }).toFile(path); }
// Stable filenames keep installed apps and notification callers compatible.
await Promise.all([
  save(eventLogo(192), "public/icons/icon-192.png"),
  save(eventLogo(512), "public/icons/icon-512.png"),
  save(paddedLogo(192), "public/icons/icon-splash-192.png"),
  save(paddedLogo(512), "public/icons/icon-splash-512.png"),
  // The complete square mark fits inside the maskable icon's central safe circle.
  save(paddedLogo(512, 0.55), "public/icons/icon-maskable-512.png"),
  save(eventLogo(32), "public/icons/favicon-32.png"),
  save(eventLogo(64), "public/icons/favicon-64.png"),
  save(eventLogo(96), "public/icons/mascot-96.png"),
  save(paddedLogo(192), "public/icons/notification-icon-192.png"),
  save(paddedLogo(180), "public/icons/apple-icon-180.png"),
]);
// Android badges require monochrome artwork with transparent surroundings.
const badgeAlpha = await sharp(await eventLogo(96)).extractChannel("alpha").toBuffer();
await sharp({ create: { width: 96, height: 96, channels: 3, background: ART.paper } })
  .joinChannel(badgeAlpha).png().toFile("public/icons/notification-badge-96.png");

const shareBackground = gridSvg(1200, 630, 60, [
  [0, 0, "blue"], [1, 0, "violet"], [19, 0, "pink"], [19, 1, "orange"],
  [0, 9, "green"], [1, 9, "blue"], [18, 9, "violet"], [19, 9, "pink"],
]);
const shareCopy = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <g font-family="Arial, sans-serif" text-anchor="middle" fill="${ART.ink}">
    <text x="600" y="385" font-size="27" font-weight="600">AWS Student Community Day</text>
    <text x="600" y="425" font-size="27" font-weight="600">South Summity 2026</text>
    <text x="600" y="481" font-size="23" fill="${ART.muted}">Your event day, in one place.</text>
  </g>
</svg>`);
const mark=await wordmark(135);
const markMetadata=await sharp(mark).metadata();
const ogImage = await sharp(Buffer.from(shareBackground)).composite([
  { input: await eventLogo(100), top: 74, left: 550 },
  { input: mark, top: 195, left: Math.round((1200-markMetadata.width)/2) },
  { input: shareCopy, top: 0, left: 0 },
]).png({ compressionLevel: 9 }).toBuffer();
await Promise.all([sharp(ogImage).toFile("app/opengraph-image.png"), sharp(ogImage).toFile("app/twitter-image.png")]);
console.log(`Generated Sync icons and share images for ${EVENT_NAME}.`);
