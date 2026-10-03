import sharp from "sharp";
import { ART, EVENT_NAME, eventLogo, gridSvg } from "./event-art.mjs";

const WIDTH = 1080;
const HEIGHT = 1920;
// These are the booth's existing output coordinates; capture and cropping stay unchanged.
const slots = [[124, 99], [131, 641], [131, 1182]];
const logo = await eventLogo(108);

for (const [number, first, second] of [[1, "blue", "green"], [2, "violet", "pink"]]) {
  const background = gridSvg(WIDTH, HEIGHT, 60, [
    [0, 0, first], [1, 0, second], [17, 0, second], [17, 1, first],
    [0, 10, second], [17, 19, first], [0, 29, first], [1, 30, second], [17, 31, second],
  ]);
  const windows = slots.map(([x, y]) => `<rect x="${x - 6}" y="${y - 6}" width="834" height="471" fill="${ART.ink}"/><rect x="${x}" y="${y}" width="822" height="459" fill="${ART.paper}"/>`).join("");
  const copy = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    ${windows}
    <rect x="205" y="1785" width="670" height="110" fill="${ART.paper}"/>
    <g font-family="Arial, sans-serif" text-anchor="middle" fill="${ART.ink}" font-size="32" font-weight="600">
      <text x="540" y="1825">AWS Student Community Day</text>
      <text x="540" y="1872">South Summity 2026</text>
    </g>
  </svg>`);
  await sharp(Buffer.from(background)).composite([
    { input: copy, top: 0, left: 0 },
    { input: logo, top: 1669, left: 486 },
  ]).png({ compressionLevel: 9 }).toFile(`public/assets/south-summity-frame-${number}.png`);
}
console.log(`Generated two 1080×1920 frames for ${EVENT_NAME}; no date or photo overlays.`);
