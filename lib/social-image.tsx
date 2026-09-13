import { ImageResponse } from "next/og";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 };

export function createSyncSocialImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f9fd",
          color: "#14213d",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: "-1px" }}>
            Sync<span style={{ color: "#2457d6" }}>/</span>
          </div>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: "3px", textTransform: "uppercase", color: "#46536d" }}>
            Event flow without the scramble
          </div>
        </div>
        <div style={{ display: "flex", maxWidth: 920, fontSize: 82, fontWeight: 700, lineHeight: 1.02, letterSpacing: "-4px" }}>
          One calm place for the whole event.
        </div>
        <div style={{ display: "flex", gap: 48, borderTop: "2px solid #d5deed", paddingTop: 28, fontSize: 21, color: "#46536d" }}>
          <span>Schedules</span>
          <span>Live updates</span>
          <span>Attendee connection</span>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE,
  );
}
