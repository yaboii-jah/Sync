import sharp from "sharp";

// Raster/canvas assets use explicit colors from the locked design.md palette.
export const EVENT_NAME = "AWS Student Community Day South Summity 2026";
export const LOGO_SOURCE = "public/new-assets/SS2026 Icon - Transparent.png";
export const ART = {
  paper: "#ffffff", ink: "#17171c", muted: "#45454f", grid: "#d8dbe2",
  blue: "#42b4ff", green: "#00e582", violet: "#ad5cff", pink: "#ff2cfd", orange: "#ff9900",
};

export async function eventLogo(size) {
  return sharp(LOGO_SOURCE).trim().resize(size, size, { fit: "contain", background: "transparent" }).png().toBuffer();
}

export function gridSvg(width, height, cell, tiles = []) {
  const squares = tiles.map(([col, row, color]) => `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${ART[color]}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><pattern id="grid" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><path d="M ${cell} 0 H 0 V ${cell}" fill="none" stroke="${ART.grid}" stroke-width="1"/></pattern></defs>
    <rect width="100%" height="100%" fill="${ART.paper}"/>${squares}<rect width="100%" height="100%" fill="url(#grid)"/>
  </svg>`;
}

export async function wordmark(size) {
  return sharp({ text: {
    text: `<span foreground="${ART.ink}">Sync</span>`,
    font: `Perandory Semi-Condensed ${size}`,
    fontfile: "app/fonts/COMMERCIAL/PERANDORY/Perandory-Semi-Condensed.otf",
    rgba: true, dpi: 72,
  } }).png().toBuffer();
}
