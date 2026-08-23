import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#024056"/>
  <circle cx="256" cy="256" r="196" fill="none" stroke="#BC8330" stroke-width="6" opacity="0.9"/>
  <rect x="0" y="0" width="512" height="512" rx="96" fill="url(#glow)" opacity="0.35"/>
  <defs>
    <radialGradient id="glow" cx="82%" cy="10%" r="80%">
      <stop offset="0%" stop-color="#E6B84F" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="#197B62" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#041A19" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="comet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCDB64"/>
      <stop offset="100%" stop-color="#BC8330" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g transform="rotate(-32 256 256)">
    <rect x="120" y="248" width="272" height="8" rx="4" fill="url(#comet)"/>
    <circle cx="392" cy="252" r="14" fill="#FCDB64"/>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile("public/icons/icon-512.png");

const maskable = svg.replace('rx="96"', 'rx="0"');
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");

console.log("icons generated");
