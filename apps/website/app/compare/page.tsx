"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

interface CompareSalon {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  address: string;
  premium: boolean;
  verified: boolean;
  homeService: boolean;
  instantBooking: boolean;
  gender: string;
  area: { name: string; city: { name: string } };
  images: { url: string; alt: string }[];
  services: { id: string; name: string; price: number; durationMin: number }[];
  employees: { id: string; name: string; title: string }[];
  workingHours: { dayOfWeek: number; openMin: number; closeMin: number; closed: boolean }[];
}

export default function ComparePage() {
  const [input, setInput] = useState("");
  const [salons, setSalons] = useState<CompareSalon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    const ids = input.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    if (ids.length < 2) {
      setError("Provide at least 2 salon IDs (comma-separated)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api<{ salons: CompareSalon[] }>(`/api/compare?ids=${ids.join(",")}`);
      setSalons(res.salons);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load salons");
    } finally {
      setLoading(false);
    }
  };

  const best = (key: "rating" | "priceFrom" | "reviewCount"): string | null => {
    if (salons.length < 2) return null;
    if (key === "rating" || key === "reviewCount") {
      return salons.reduce((a, b) => (a[key] > b[key] ? a : b)).id;
    }
    return salons.reduce((a, b) => (a[key] < b[key] ? a : b)).id;
  };

  const bestRating = best("rating");
  const bestPrice = best("priceFrom");

  const cell = (content: React.ReactNode, isBest = false) => (
    <td style={{
      padding: "14px 16px",
      fontSize: 14,
      color: "#1C1C1C",
      verticalAlign: "top",
      borderBottom: "1px solid rgba(28,28,28,.07)",
      background: isBest ? "rgba(176,106,133,.08)" : undefined,
    }}>
      {content}
    </td>
  );

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(36px,6vh,64px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Compare</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,60px)", marginTop: 10 }}>Compare Salons</h1>
        <p style={{ fontSize: 16, color: "#5a5457", marginTop: 8 }}>Paste comma-separated salon IDs to compare up to 3 salons side by side.</p>

        <div style={{
          display: "flex",
          gap: 10,
          marginTop: 24,
          padding: 14,
          borderRadius: 20,
          background: "rgba(255,255,255,.7)",
          border: "1px solid rgba(28,28,28,.07)",
          flexWrap: "wrap",
        }}>
          <input
            className="bb-input"
            style={{ flex: "1 1 300px", width: "auto" }}
            placeholder="Salon IDs (e.g. abc123, def456, ghi789)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCompare(); } }}
            aria-label="Salon IDs"
          />
          <button
            onClick={() => void handleCompare()}
            className="bb-btn"
            style={{ padding: "12px 26px", border: "none", borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Compare"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 24, padding: 16, borderRadius: 16, background: "rgba(235,200,211,.25)", border: "1px solid rgba(176,106,133,.25)", fontSize: 15, color: "#4a4446" }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 40 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "inline-block", width: "31%", margin: "0 1%", verticalAlign: "top" }}>
                <div style={{ height: 180, borderRadius: 16, background: "rgba(28,28,28,.06)", marginBottom: 12 }} />
                <div style={{ height: 24, borderRadius: 8, background: "rgba(28,28,28,.06)", marginBottom: 8, width: "70%" }} />
                <div style={{ height: 16, borderRadius: 8, background: "rgba(28,28,28,.04)", width: "50%" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && salons.length > 0 && (
          <div style={{ marginTop: 40, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", textAlign: "left", borderBottom: "2px solid rgba(28,28,28,.1)", width: 140 }}>Category</th>
                  {salons.map((s) => (
                    <th key={s.id} style={{ padding: "14px 16px", textAlign: "center", borderBottom: "2px solid rgba(28,28,28,.1)" }}>
                      <Link href={`/salon/${s.slug}`} style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: "#1C1C1C", textDecoration: "none" }}>
                        {s.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Images */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Photos</td>
                  {salons.map((s) => (
                    <td key={s.id} style={{ padding: "14px 16px", textAlign: "center", borderBottom: "1px solid rgba(28,28,28,.07)" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {s.images.length > 0 ? s.images.map((img, idx) => (
                          <img key={idx} src={img.url} alt={img.alt || s.name} style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover" }} />
                        )) : <span style={{ fontSize: 13, color: "#5a5457" }}>—</span>}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Rating */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Rating</td>
                  {salons.map((s) => cell(
                    <>★ {s.rating.toFixed(1)} <span style={{ color: "#5a5457", fontSize: 13 }}>({s.reviewCount} reviews)</span></>,
                    s.id === bestRating,
                  ))}
                </tr>

                {/* Price */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Price from</td>
                  {salons.map((s) => cell(
                    s.priceFrom > 0 ? rupees(s.priceFrom) : "—",
                    s.id === bestPrice,
                  ))}
                </tr>

                {/* Location */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Location</td>
                  {salons.map((s) => cell(
                    <>{s.area.name}, {s.area.city.name}</>,
                  ))}
                </tr>

                {/* Address */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Address</td>
                  {salons.map((s) => cell(s.address))}
                </tr>

                {/* Services */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Services</td>
                  {salons.map((s) => {
                    const bestService = s.services.length > 0
                      ? s.services.reduce((a, b) => (a.price < b.price ? a : b))
                      : null;
                    return (
                      <td key={s.id} style={{ padding: "14px 16px", fontSize: 14, color: "#1C1C1C", verticalAlign: "top", borderBottom: "1px solid rgba(28,28,28,.07)" }}>
                        {s.services.length > 0 ? (
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457", padding: "4px 6px" }}>Service</th>
                                <th style={{ textAlign: "right", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457", padding: "4px 6px" }}>Price</th>
                                <th style={{ textAlign: "right", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457", padding: "4px 6px" }}>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.services.map((svc) => (
                                <tr key={svc.id}>
                                  <td style={{ padding: "4px 6px", fontSize: 13, color: svc.id === (bestService?.id ?? "") ? "#B06A85" : "#1C1C1C", fontWeight: svc.id === (bestService?.id ?? "") ? 600 : 400 }}>{svc.name}</td>
                                  <td style={{ padding: "4px 6px", fontSize: 13, textAlign: "right", color: "#5a5457" }}>{rupees(svc.price)}</td>
                                  <td style={{ padding: "4px 6px", fontSize: 13, textAlign: "right", color: "#5a5457" }}>{fmtMin(svc.durationMin)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : <span style={{ color: "#5a5457", fontSize: 13 }}>No services listed</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* Working hours */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Hours</td>
                  {salons.map((s) => (
                    <td key={s.id} style={{ padding: "14px 16px", fontSize: 14, color: "#1C1C1C", verticalAlign: "top", borderBottom: "1px solid rgba(28,28,28,.07)" }}>
                      {days.map((name, idx) => {
                        const wh = s.workingHours.find((h) => h.dayOfWeek === idx);
                        return (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3px 0", fontSize: 13 }}>
                            <span style={{ color: "#5a5457", minWidth: 50 }}>{name.slice(0, 3)}</span>
                            <span>{wh && !wh.closed ? `${fmtMin(wh.openMin)} – ${fmtMin(wh.closeMin)}` : "Closed"}</span>
                          </div>
                        );
                      })}
                    </td>
                  ))}
                </tr>

                {/* Features */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Features</td>
                  {salons.map((s) => {
                    const features = [
                      { label: "Verified", value: s.verified },
                      { label: "Premium", value: s.premium },
                      { label: "Home service", value: s.homeService },
                      { label: "Instant booking", value: s.instantBooking },
                    ];
                    return (
                      <td key={s.id} style={{ padding: "14px 16px", fontSize: 14, color: "#1C1C1C", verticalAlign: "top", borderBottom: "1px solid rgba(28,28,28,.07)" }}>
                        {features.map((f) => (
                          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 13 }}>
                            <span style={{ color: f.value ? "#1C1C1C" : "#bdb5b8", fontSize: 16 }}>{f.value ? "✓" : "○"}</span>
                            {f.label}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>

                {/* Employees */}
                <tr>
                  <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457", borderBottom: "1px solid rgba(28,28,28,.07)" }}>Staff</td>
                  {salons.map((s) => (
                    <td key={s.id} style={{ padding: "14px 16px", fontSize: 14, color: "#1C1C1C", verticalAlign: "top", borderBottom: "1px solid rgba(28,28,28,.07)" }}>
                      {s.employees.length > 0 ? s.employees.map((emp) => (
                        <div key={emp.id} style={{ padding: "2px 0", fontSize: 13 }}>
                          <span style={{ fontWeight: 500 }}>{emp.name}</span>
                          <span style={{ color: "#5a5457" }}> – {emp.title}</span>
                        </div>
                      )) : <span style={{ color: "#5a5457", fontSize: 13 }}>—</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && salons.length === 0 && (
          <div style={{ marginTop: 60, textAlign: "center" }}>
            <p style={{ fontFamily: serif, fontSize: 24, color: "#5a5457" }}>
              Enter salon IDs above to get started.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
