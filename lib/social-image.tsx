import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const identityFont = readFile(join(process.cwd(), "app/fonts/COMMERCIAL/PERANDORY/Perandory-Semi-Condensed.otf"));
// Next's installed OG renderer bundles the same Geist family used by the app.
const bodyFont = readFile(join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"));

// ImageResponse cannot consume browser CSS variables. Keep this palette aligned
// with app/globals.css; ui-theme.test.ts guards against drift.
const theme = {
  background: "#052f3c",
  foreground: "#f2f7ed",
  accent: "#fcdb64",
  muted: "#b5cbc7",
  border: "#28606a",
} as const;

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export async function createSyncSocialImage(): Promise<ImageResponse> {
  const font = await identityFont;
  const geist = await bodyFont;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#052f3c",
          color: theme.foreground,
          padding: "72px",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", color: theme.accent, fontFamily: "Perandory", fontSize: 54, letterSpacing: "2px" }}>
            SYNC
          </div>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: "3px", textTransform: "uppercase", color: theme.muted }}>
            Event flow without the scramble
          </div>
        </div>
        <div style={{ display: "flex", maxWidth: 920, fontSize: 82, fontWeight: 700, lineHeight: 1.02, letterSpacing: "-4px" }}>
          One calm place for the whole event.
        </div>
        <div style={{ display: "flex", gap: 48, borderTop: `2px solid ${theme.border}`, paddingTop: 28, fontSize: 21, color: theme.muted }}>
          <span>Schedules</span>
          <span>Live updates</span>
          <span>Attendee connection</span>
        </div>
      </div>
    ),
    {
      ...SOCIAL_IMAGE_SIZE,
      fonts: [
        { name: "Geist", data: geist.buffer.slice(geist.byteOffset, geist.byteOffset + geist.byteLength) as ArrayBuffer, style: "normal", weight: 400 },
        { name: "Perandory", data: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer, style: "normal", weight: 400 },
      ],
    },
  );
}
