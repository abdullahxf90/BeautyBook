"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

interface MetaCity {
  name: string;
  areas: { name: string }[];
}

interface MetaCategory {
  name: string;
  slug: string;
}

interface Meta {
  cities: MetaCity[];
  categories: MetaCategory[];
}

interface SlotSalon {
  id: string;
  slug: string;
  name: string;
  rating: number;
  reviewCount: number;
  priceFrom: number;
  premium: boolean;
  area: { name: string; city: { name: string } };
}

interface SlotResult {
  salon: SlotSalon;
  staffAvailable: number;
  nextSlot: string;
}

interface ByTimeResponse {
  slots: SlotResult[];
}

const selectStyle = {
  padding: "11px 14px",
  borderRadius: 14,
  border: "1px solid rgba(28,28,28,.12)",
  background: "rgba(255,255,255,.8)",
  fontSize: 14,
  fontWeight: 500 as const,
  color: "#1C1C1C",
  outline: "none",
  cursor: "pointer",
  width: "100%",
};

const inputStyle = {
  padding: "11px 14px",
  borderRadius: 14,
  border: "1px solid rgba(28,28,28,.12)",
  background: "rgba(255,255,255,.8)",
  fontSize: 14,
  fontWeight: 500 as const,
  color: "#1C1C1C",
  outline: "none",
  width: "100%",
};

function todayString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function SmartSearchPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [results, setResults] = useState<SlotResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [date, setDate] = useState(todayString());
  const [fromTime, setFromTime] = useState("10:00");
  const [toTime, setToTime] = useState("19:00");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [serviceId, setServiceId] = useState("");

  const areas = city
    ? meta?.cities.find((c) => c.name === city)?.areas || []
    : [];

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => setMeta(null));
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    setResults(null);
    try {
      const sp = new URLSearchParams();
      sp.set("date", date);
      sp.set("startTime", fromTime);
      sp.set("endTime", toTime);
      if (city) sp.set("city", city);
      if (area) sp.set("area", area);
      if (serviceId) sp.set("serviceId", serviceId);
      const res = await api<ByTimeResponse>(`/api/search/by-time?${sp.toString()}`);
      setResults(res.slots);
    } catch {
      setError("Could not search. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }, [date, fromTime, toTime, city, area, serviceId]);

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(36px,6vh,64px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>
          Smart Search
        </span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,60px)", marginTop: 10 }}>
          When are you free?
        </h1>
        <p style={{ fontSize: 16, color: "#5a5457", marginTop: 8 }}>
          Find salons that can serve you in a specific time window.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); void handleSearch(); }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: 24,
            padding: 20,
            borderRadius: 20,
            background: "rgba(255,255,255,.7)",
            border: "1px solid rgba(28,28,28,.07)",
            boxShadow: "0 20px 50px -30px rgba(28,28,28,.3)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4a4446", marginBottom: 6, display: "block" }}>Date</label>
              <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4a4446", marginBottom: 6, display: "block" }}>From</label>
              <input type="time" style={inputStyle} value={fromTime} onChange={(e) => setFromTime(e.target.value)} aria-label="From time" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#4a4446", marginBottom: 6, display: "block" }}>To</label>
              <input type="time" style={inputStyle} value={toTime} onChange={(e) => setToTime(e.target.value)} aria-label="To time" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <select style={selectStyle} value={city} onChange={(e) => { setCity(e.target.value); setArea(""); }} aria-label="City">
              <option value="">All cities</option>
              {(meta?.cities || []).map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select style={selectStyle} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" disabled={!city}>
              <option value="">All areas</option>
              {areas.map((a) => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
            <select style={selectStyle} value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label="Service">
              <option value="">All services</option>
              {(meta?.categories || []).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="bb-btn"
            style={{
              alignSelf: "flex-start",
              padding: "12px 32px",
              border: "none",
              borderRadius: 14,
              background: "#1C1C1C",
              color: "#FAF8F7",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Searching…" : "Find Available Salons"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 32, padding: 24, borderRadius: 20, background: "rgba(235,200,211,.25)", border: "1px solid rgba(176,106,133,.25)", fontSize: 15, color: "#4a4446" }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ marginTop: 40, display: "grid", gap: 20 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ borderRadius: 20, padding: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 10px 30px -20px rgba(28,28,28,.35)" }}>
                <div style={{ height: 22, width: "60%", borderRadius: 8, background: "rgba(28,28,28,.06)", marginBottom: 12 }} />
                <div style={{ height: 16, width: "40%", borderRadius: 8, background: "rgba(28,28,28,.06)", marginBottom: 16 }} />
                <div style={{ height: 14, width: "30%", borderRadius: 8, background: "rgba(28,28,28,.06)" }} />
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results && results.length === 0 && (
          <p style={{ marginTop: 40, fontFamily: serif, fontSize: 24, color: "#5a5457", textAlign: "center" }}>
            No salons available in that time window.
          </p>
        )}

        {!loading && results && results.length > 0 && (
          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 15, color: "#5a5457" }}>
              {results.length} salon{results.length === 1 ? "" : "s"} available
            </p>
            {results.map((slot) => (
              <div
                key={slot.salon.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 22px",
                  borderRadius: 20,
                  background: "#fff",
                  border: "1px solid rgba(28,28,28,.06)",
                  boxShadow: "0 10px 30px -20px rgba(28,28,28,.35)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Link href={`/salon/${slot.salon.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: 0 }}>{slot.salon.name}</h3>
                    </Link>
                    {slot.salon.premium && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#7a5c14", background: "rgba(212,175,55,.9)", padding: "4px 10px", borderRadius: 10 }}>
                        Premium
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a8a4a", background: "rgba(26,138,74,.12)", padding: "5px 12px", borderRadius: 12, whiteSpace: "nowrap" }}>
                      Available
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#5a5457", margin: "4px 0 0" }}>
                    {slot.salon.area.name}, {slot.salon.area.city.name}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 10 }}>
                    <span style={{ fontSize: 13, color: "#4a4446" }}>★ {slot.salon.rating.toFixed(1)} · {slot.salon.reviewCount}</span>
                    <span style={{ fontSize: 13, color: "#4a4446" }}>
                      from <strong>{rupees(slot.salon.priceFrom)}</strong>
                    </span>
                    <span style={{ fontSize: 13, color: "#B06A85", fontWeight: 600 }}>
                      {slot.staffAvailable} staff available
                    </span>
                  </div>
                </div>
                <Link
                  href={`/book/${slot.salon.slug}`}
                  className="bb-btn"
                  style={{
                    border: "none",
                    borderRadius: 16,
                    background: "#1C1C1C",
                    color: "#FAF8F7",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "11px 22px",
                    cursor: "pointer",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
