import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BeautyBook — Pakistan's beauty marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card, rendered on the fly (no binary asset to maintain).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FAF8F7",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#B06A85", fontSize: 26, fontWeight: 600, letterSpacing: 2 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#B06A85" }} />
          PAKISTAN&apos;S BEAUTY MARKETPLACE
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, color: "#1C1C1C", marginTop: 28, lineHeight: 1.05, letterSpacing: -3, maxWidth: 900 }}>
          Find. Book. Glow.
        </div>
        <div style={{ fontSize: 34, color: "#575153", marginTop: 24, maxWidth: 860 }}>
          Discover salons, compare real reviews, and book in seconds.
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 40, fontWeight: 700, color: "#1C1C1C", letterSpacing: -1 }}>
          BeautyBook
        </div>
      </div>
    ),
    size,
  );
}
