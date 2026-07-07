import Link from "next/link";
import Reveal from "./Reveal";
import { rupees, SalonSummary } from "@/lib/api";

/** Featured salon card — ported exactly from the homepage design. */
export default function SalonCard({ salon, slots }: { salon: SalonSummary; slots?: string[] }) {
  const imageAlt = salon.images?.[0]?.alt || "salon interior photo";
  return (
    <Reveal
      style={{
        borderRadius: 22,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid rgba(28,28,28,.06)",
        boxShadow: "0 10px 30px -20px rgba(28,28,28,.35)",
      }}
    >
      <div className="bb-lift" style={{ borderRadius: 22, overflow: "hidden" }}>
        <Link href={`/salon/${salon.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div className="bb-ph" style={{ position: "relative", height: 200 }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: 14,
                fontFamily: "'Hanken Grotesk'",
                fontSize: 12,
                fontWeight: 600,
                background: "rgba(255,255,255,.85)",
                padding: "6px 12px",
                borderRadius: 14,
                color: "#1C1C1C",
              }}
            >
              ★ {salon.rating.toFixed(1)} · {salon.reviewCount}
            </span>
            {salon.premium && (
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "#7a5c14",
                  background: "rgba(212,175,55,.9)",
                  padding: "6px 11px",
                  borderRadius: 14,
                }}
              >
                Premium
              </span>
            )}
            <span style={{ position: "absolute", left: 0, bottom: 0, fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85", padding: "8px 12px" }}>
              {imageAlt}
            </span>
          </div>
        </Link>
        <div style={{ padding: "20px 22px 22px" }}>
          <Link href={`/salon/${salon.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 600 }}>{salon.name}</h3>
          </Link>
          <p style={{ fontSize: 14, color: "#5a5457", marginTop: 2 }}>
            {salon.area.name}, {salon.area.city.name}
          </p>
          {slots && slots.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
              {slots.map((slot) => (
                <span
                  key={slot}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#B06A85",
                    background: "rgba(235,200,211,.35)",
                    padding: "6px 12px",
                    borderRadius: 12,
                  }}
                >
                  {slot}
                </span>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid rgba(28,28,28,.07)",
            }}
          >
            <div>
              <span style={{ fontSize: 13, color: "#5a5457" }}>from </span>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 600 }}>{rupees(salon.priceFrom)}</span>
            </div>
            <Link
              href={`/book/${salon.slug}`}
              className="bb-btn"
              style={{
                border: "none",
                borderRadius: 16,
                background: "#1C1C1C",
                color: "#FAF8F7",
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 20px",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Book now
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
