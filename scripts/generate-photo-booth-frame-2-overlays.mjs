import sharp from "sharp";

const FRAME_SOURCE = "public/assets/event-frame-2-background.png";
const FRAME_OUTPUT = "public/assets/event-frame-source-2.png";
const FRAME_WIDTH = 941;
const FRAME_HEIGHT = 1672;
const MASCOT_OVERLAYS = [
  {
    source: "public/assets/event-frame-2-mascot-crystal.png",
    bounds: { left: 1900, top: 597, width: 2851, height: 5006 },
    width: 142,
    height: 250,
    output: "public/assets/event-frame-2-top-overlay.png",
  },
  {
    source: "public/assets/event-frame-2-mascot-fox.png",
    bounds: { left: 877, top: 441, width: 4145, height: 5114 },
    width: 190,
    height: 235,
    output: "public/assets/event-frame-2-left-overlay.png",
  },
];
const TITLE_WIDTH = 560;
const TITLE_HEIGHT = 135;
const TITLE_OUTPUT = "public/assets/event-frame-2-title-overlay.png";
const DATE_WIDTH = 200;
const DATE_HEIGHT = 50;
const DATE_OUTPUT = "public/assets/event-frame-2-date-overlay.png";
const IDENTITY_FONT = "app/fonts/COMMERCIAL/PERANDORY/Perandory-Regular.otf";

async function createMascotOverlay({ source, bounds, width, height, output }) {
  await sharp(source)
    .extract(bounds)
    .resize(width, height)
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(output);
}

async function createTitleOverlay() {
  const alpha = await sharp({
    text: {
      text: "STUDENT COMMUNITY DAY\nMEGA MANILA 2026",
      font: "Perandory Regular",
      fontfile: IDENTITY_FONT,
      width: TITLE_WIDTH,
      height: TITLE_HEIGHT,
      align: "centre",
      rgba: true,
    },
  })
    .ensureAlpha()
    .extractChannel(3)
    .resize(TITLE_WIDTH, TITLE_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer();

  const mask = {
    raw: {
      width: TITLE_WIDTH,
      height: TITLE_HEIGHT,
      channels: 1,
    },
  };
  const createText = (color) =>
    sharp({
      create: {
        width: TITLE_WIDTH,
        height: TITLE_HEIGHT,
        channels: 3,
        background: color,
      },
    })
      .joinChannel(alpha, mask)
      .png()
      .toBuffer();
  const [keyline, title] = await Promise.all([createText("#143d4a"), createText("#f8f0bb")]);

  return sharp({
    create: {
      width: TITLE_WIDTH,
      height: TITLE_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: keyline, left: -1, top: 0 },
      { input: keyline, left: 1, top: 0 },
      { input: keyline, left: 0, top: -1 },
      { input: keyline, left: 0, top: 1 },
      { input: title, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(TITLE_OUTPUT);
}

function createDateOverlay() {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${DATE_WIDTH}" height="${DATE_HEIGHT}" viewBox="0 0 ${DATE_WIDTH} ${DATE_HEIGHT}">
  <text x="${DATE_WIDTH / 2}" y="36" text-anchor="middle" fill="#f8f0bb" stroke="#143d4a" stroke-width="0.9" paint-order="stroke" font-family="Arial, sans-serif" font-size="32" font-weight="700" font-style="italic" letter-spacing="0.6">09.11.26</text>
</svg>`);

  return sharp(svg).png({ compressionLevel: 9 }).toFile(DATE_OUTPUT);
}

await Promise.all([
  sharp(FRAME_SOURCE)
    .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(FRAME_OUTPUT),
  ...MASCOT_OVERLAYS.map(createMascotOverlay),
  createTitleOverlay(),
  createDateOverlay(),
]);
