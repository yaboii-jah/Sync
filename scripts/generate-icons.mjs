import sharp from "sharp";

const logo = sharp("public/logo.png");

await Promise.all([
  logo.clone().resize(192, 192).png().toFile("public/icons/icon-192.png"),
  logo.clone().resize(512, 512).png().toFile("public/icons/icon-512.png"),
  logo
    .clone()
    .resize(512, 512)
    .png()
    .toFile("public/icons/icon-maskable-512.png"),
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
