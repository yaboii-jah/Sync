import sharp from "sharp";

const SOURCE = "public/logo.png";
const BRAND_TEAL = "#024056";
const SOURCE_SIZE = 447;
const MASCOT_CROP = { left: 71, top: 71, width: 306, height: 306 };

function circleMask(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
}

async function rasterizedCircleMask(size) {
  return sharp(circleMask(size))
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();
}

async function fullSeal(size) {
  const mask = await rasterizedCircleMask(SOURCE_SIZE);
  const masked = await sharp(SOURCE)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  return sharp(masked)
    .resize(size, size, { fit: "fill" })
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer();
}

async function mascot(size) {
  const cropped = await sharp(SOURCE)
    .extract(MASCOT_CROP)
    .ensureAlpha()
    .toBuffer();
  const masked = await sharp(cropped)
    .composite([
      {
        input: await rasterizedCircleMask(MASCOT_CROP.width),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  return sharp(masked)
    .resize(size, size, { fit: "fill" })
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer();
}

async function paddedSeal(size) {
  const seal = await fullSeal(Math.round(size * 0.78));

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_TEAL,
    },
  })
    .composite([{ input: seal, gravity: "center" }])
    .png()
    .toBuffer();
}

async function save(bufferPromise, path) {
  const buffer = await bufferPromise;
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(path);
}

const notificationBadge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <path fill="#fff" d="M48 6 78 29 68 67 48 90 28 67 18 29 48 6Z"/>
</svg>`);

await Promise.all([
  save(fullSeal(192), "public/icons/icon-192.png"),
  save(fullSeal(512), "public/icons/icon-512.png"),
  save(paddedSeal(512), "public/icons/icon-maskable-512.png"),
  save(mascot(32), "public/icons/favicon-32.png"),
  save(mascot(64), "public/icons/favicon-64.png"),
  save(mascot(96), "public/icons/mascot-96.png"),
  save(mascot(192), "public/icons/notification-icon-192.png"),
  save(Promise.resolve(notificationBadge), "public/icons/notification-badge-96.png"),
  save(paddedSeal(180), "public/icons/apple-icon-180.png"),
]);

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#024056"/>
  <defs>
    <radialGradient id="og-glow" cx="80%" cy="8%" r="85%">
      <stop offset="0%" stop-color="#E6B84F" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#197B62" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#041A19" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="og-comet" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FCDB64"/>
      <stop offset="100%" stop-color="#BC8330" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="og-city-glow" cx="50%" cy="100%" r="75%">
      <stop offset="0%" stop-color="#E6B84F" stop-opacity="0.4"/>
      <stop offset="60%" stop-color="#E6B84F" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#E6B84F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-glow)"/>
  <g fill="#E6FFC9">
    <circle cx="140" cy="110" r="3"/>
    <circle cx="420" cy="70" r="2.5"/>
    <circle cx="760" cy="130" r="3"/>
    <circle cx="1020" cy="90" r="2.5"/>
    <circle cx="260" cy="220" r="2.5"/>
    <circle cx="900" cy="240" r="3"/>
    <circle cx="560" cy="180" r="2"/>
    <circle cx="1100" cy="200" r="2"/>
  </g>
  <g transform="rotate(-24 600 200)">
    <rect x="380" y="196" width="440" height="5" rx="2.5" fill="url(#og-comet)"/>
    <circle cx="820" cy="198.5" r="12" fill="#FCDB64"/>
  </g>
  <rect x="0" y="240" width="1200" height="390" fill="url(#og-city-glow)"/>
  <path d="M0 630 V520 H110 V480 H240 V540 H370 V440 H470 V510 H600 V470 H720 V545 H840 V455 H950 V520 H1070 V480 H1200 V630 Z"
        fill="#041A19" stroke="#BC8330" stroke-width="2"/>
</svg>`;

await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile("app/opengraph-image.png");

console.log("icons + OG image generated");
