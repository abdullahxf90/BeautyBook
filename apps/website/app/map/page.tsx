"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";
const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

interface MapMarker {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  rating: number;
  priceFrom: number;
  image: string | null;
  verified: boolean;
}

interface MarkersResponse {
  markers: MapMarker[];
  total: number;
}

const CITIES = ["All", "Karachi", "Lahore", "Islamabad"] as const;
type City = (typeof CITIES)[number];

const CITY_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  Karachi: { latMin: 24.7, latMax: 25.1, lngMin: 66.8, lngMax: 67.3 },
  Lahore: { latMin: 31.3, latMax: 31.6, lngMin: 74.2, lngMax: 74.5 },
  Islamabad: { latMin: 33.5, latMax: 33.8, lngMin: 72.9, lngMax: 73.2 },
};

function latToPct(lat: number) {
  return ((35 - lat) / (35 - 24)) * 100;
}

function lngToPct(lng: number) {
  return ((lng - 66) / (76 - 66)) * 100;
}

function getCity(m: MapMarker): string {
  for (const [city, b] of Object.entries(CITY_BOUNDS)) {
    if (m.latitude >= b.latMin && m.latitude <= b.latMax && m.longitude >= b.lngMin && m.longitude <= b.lngMax) return city;
  }
  return "";
}

function stars(n: number) {
  return "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
}

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCity, setActiveCity] = useState<City>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [isMobile, setIsMobile] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    api<MarkersResponse>("/api/salons/map-data")
      .then((d) => { setMarkers(d.markers); })
      .catch(() => setError("Could not load salon locations. Make sure the API is running."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = markers;
    if (activeCity !== "All") {
      list = list.filter((m) => getCity(m) === activeCity);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [markers, activeCity, search]);

  const handleDotClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCardClick = useCallback((id: string) => {
    setSelectedId(id);
    const dot = document.getElementById(`dot-${id}`);
    if (dot && mapRef.current) {
      dot.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const activeMarker = useMemo(() => filtered.find((m) => m.id === selectedId), [filtered, selectedId]);

  const skeleton = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ height: 90, borderRadius: 16, background: "rgba(28,28,28,.04)", animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );

  const emptyState = (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
      <p style={{ fontFamily: serif, fontSize: 24, color: "#5a5457" }}>No salons found</p>
      <p style={{ fontSize: 15, color: "#8a8487", marginTop: 8 }}>
        {search ? "Try a different search term." : "No salons match the selected filter."}
      </p>
    </div>
  );

  const errorState = (
    <div style={{ margin: 24, padding: 24, borderRadius: 20, background: "rgba(235,200,211,.25)", border: "1px solid rgba(176,106,133,.25)", fontSize: 15, color: "#4a4446" }}>
      {error}
    </div>
  );

  const cityColor = "#B06A85";
  const cityLabelStyle: React.CSSProperties = {
    position: "absolute",
    fontFamily: serif,
    fontSize: 15,
    fontWeight: 600,
    color: cityColor,
    letterSpacing: ".04em",
    pointerEvents: "none",
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(24px,4vh,48px) clamp(16px,3vw,32px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Discover</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(32px,4vw,52px)", marginTop: 8 }}>Salon map</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 6, marginBottom: 24 }}>
          {loading ? "Loading locations…" : `${filtered.length} salon${filtered.length === 1 ? "" : "s"} on the map`}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => { setActiveCity(c); setSelectedId(null); }}
              style={{
                padding: "8px 20px",
                borderRadius: 20,
                border: activeCity === c ? "none" : "1px solid rgba(28,28,28,.12)",
                background: activeCity === c ? "#1C1C1C" : "rgba(255,255,255,.7)",
                color: activeCity === c ? "#FAF8F7" : "#1C1C1C",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search salons"
            style={{
              flex: "1 1 200px",
              padding: "9px 14px",
              borderRadius: 20,
              border: "1px solid rgba(28,28,28,.12)",
              background: "rgba(255,255,255,.7)",
              fontSize: 13,
              outline: "none",
              color: "#1C1C1C",
            }}
          />
        </div>

        {isMobile && (
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(28,28,28,.1)" }}>
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  border: "none",
                  background: mobileView === v ? "#1C1C1C" : "transparent",
                  color: mobileView === v ? "#FAF8F7" : "#1C1C1C",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {v} view
              </button>
            ))}
          </div>
        )}

        {error && errorState}

        <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
          {/* MAP PANEL */}
          <div
            ref={mapRef}
            style={{
              flex: isMobile && mobileView === "list" ? "0 0 0" : "3",
              overflow: "hidden",
              display: isMobile && mobileView === "list" ? "none" : "block",
              position: "relative",
              borderRadius: 24,
              background: "#F3EFEC",
              border: "1px solid rgba(28,28,28,.07)",
              boxShadow: "0 20px 50px -30px rgba(28,28,28,.3)",
              minHeight: isMobile ? 400 : 600,
              backgroundImage: `
                linear-gradient(rgba(28,28,28,.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(28,28,28,.05) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          >
            {/* City labels */}
            <span style={{ ...cityLabelStyle, left: "12%", top: "8%" }}>Islamabad</span>
            <span style={{ ...cityLabelStyle, left: "50%", top: "46%" }}>Lahore</span>
            <span style={{ ...cityLabelStyle, left: "14%", bottom: "12%" }}>Karachi</span>

            {loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 18, color: "#8a8487" }}>Loading map…</div>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
                  <p style={{ fontFamily: serif, fontSize: 20, color: "#5a5457" }}>No salons to show</p>
                </div>
              </div>
            )}

            {!loading && filtered.map((m) => {
              const x = lngToPct(m.longitude);
              const y = latToPct(m.latitude);
              const isActive = selectedId === m.id;
              const isHovered = hoveredId === m.id;
              const dotSize = isActive ? 18 : isHovered ? 16 : 12;

              return (
                <div key={m.id}>
                  <button
                    id={`dot-${m.id}`}
                    onClick={() => handleDotClick(m.id)}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={m.name}
                    style={{
                      position: "absolute",
                      left: `calc(${x}% - ${dotSize / 2}px)`,
                      top: `calc(${y}% - ${dotSize / 2}px)`,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: "50%",
                      border: isActive || isHovered ? `2px solid ${cityColor}` : "2px solid rgba(255,255,255,.7)",
                      background: isActive ? cityColor : isHovered ? "#1C1C1C" : "rgba(28,28,28,.55)",
                      cursor: "pointer",
                      transition: "all .2s ease",
                      zIndex: isActive ? 10 : isHovered ? 5 : 1,
                      padding: 0,
                    }}
                  />

                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: `min(calc(${x}% + 14px), calc(100% - 220px))`,
                        top: `max(calc(${y}% - 60px), 4px)`,
                        width: 210,
                        background: "#fff",
                        borderRadius: 16,
                        border: "1px solid rgba(28,28,28,.1)",
                        boxShadow: "0 8px 30px rgba(28,28,28,.15)",
                        padding: 14,
                        zIndex: 20,
                        pointerEvents: "auto",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {m.image && (
                        <img
                          src={m.image}
                          alt={m.name}
                          style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, marginBottom: 8 }}
                        />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, color: "#1C1C1C", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.name}
                        </span>
                        {m.verified && <span style={{ fontSize: 13, color: cityColor }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#e6a817", letterSpacing: ".04em" }}>{stars(m.rating)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", marginTop: 4 }}>{rupees(m.priceFrom)}+</div>
                      <Link
                        href={`/salon/${m.slug}`}
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          padding: "6px 14px",
                          borderRadius: 10,
                          background: "#1C1C1C",
                          color: "#FAF8F7",
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        View salon
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {selectedId && (
              <div
                style={{ position: "absolute", inset: 0, zIndex: 15 }}
                onClick={() => setSelectedId(null)}
              />
            )}
          </div>

          {/* LIST PANEL */}
          <div
            ref={listRef}
            style={{
              flex: isMobile && mobileView === "map" ? "0 0 0" : "2",
              display: isMobile && mobileView === "map" ? "none" : "block",
              borderRadius: 24,
              background: "rgba(255,255,255,.6)",
              border: "1px solid rgba(28,28,28,.07)",
              boxShadow: "0 20px 50px -30px rgba(28,28,28,.3)",
              padding: 16,
              overflowY: "auto",
              maxHeight: isMobile ? 400 : 600,
            }}
          >
            {loading && skeleton}

            {!loading && !error && filtered.length === 0 && emptyState}

            {!loading && !error && filtered.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((m) => {
                  const isActive = selectedId === m.id;
                  const isHovered = hoveredId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleCardClick(m.id)}
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 12,
                        borderRadius: 16,
                        border: isActive ? `1px solid ${cityColor}` : "1px solid transparent",
                        background: isActive ? "rgba(176,106,133,.08)" : isHovered ? "rgba(28,28,28,.03)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        fontFamily: "inherit",
                        color: "inherit",
                        transition: "all .15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 14,
                          background: m.image ? `url(${m.image}) center/cover` : "rgba(176,106,133,.12)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                          color: cityColor,
                        }}
                      >
                        {!m.image && "💇"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontFamily: serif, fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.name}
                          </span>
                          {m.verified && <span style={{ fontSize: 12, color: cityColor }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#e6a817", letterSpacing: ".04em", marginTop: 2 }}>{stars(m.rating)}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1C1C" }}>{rupees(m.priceFrom)}+</span>
                          <span style={{ fontSize: 11, color: "#8a8487" }}>{getCity(m) || "Unknown"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .4; }
          50% { opacity: .8; }
        }
      `}</style>
      <Footer />
    </>
  );
}
