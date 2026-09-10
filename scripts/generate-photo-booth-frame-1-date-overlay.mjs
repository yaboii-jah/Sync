import sharp from "sharp";

const WIDTH = 180;
const HEIGHT = 36;
const output = "public/assets/event-frame-1-date-overlay.png";

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <text x="${WIDTH / 2}" y="25" text-anchor="middle" fill="#f8f0bb" stroke="#143d4a" stroke-width="0.7" paint-order="stroke" font-family="Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="0.6">09.11.26</text>
</svg>`);

await sharp(svg).png({ compressionLevel: 9 }).toFile(output);
