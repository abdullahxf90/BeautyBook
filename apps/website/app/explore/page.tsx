"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SalonCard from "@/components/SalonCard";
import { api, SalonSummary } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

interface Meta {
  cities: { name: string; areas: { name: string }[] }[];
  categories: { name: string; slug: string }[];
}

function ExploreContent() {
  const params = useSearchParams();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [salons, setSalons] = useState<SalonSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState(params.get("q") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [minRating, setMinRating] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("rating");
  const [premium, setPremium] = useState(false);
  const [homeService, setHomeService] = useState(false);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => setMeta(null));
  }, []);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (city) sp.set("city", city);
      if (category) sp.set("category", category);
      if (minRating) sp.set("minRating", minRating);
      if (maxPrice) sp.set("maxPrice", maxPrice);
      if (premium) sp.set("premium", "true");
      if (homeService) sp.set("homeService", "true");
      sp.set("sort", sort);
      sp.set("page", String(targetPage));
      sp.set("limit", "12");
      const res = await api<{ salons: SalonSummary[]; pagination: { total: number; page: number; pages: number } }>(
        `/api/salons?${sp.toString()}`,
      );
      setSalons(res.salons);
      setTotal(res.pagination.total);
      setPage(res.pagination.page);
      setPages(res.pagination.pages);
    } catch {
      setError("Could not reach the BeautyBook API. Start it with `npm run dev:api` (and the database) to browse live salons.");
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [q, city, category, minRating, maxPrice, premium, homeService, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, category, minRating, maxPrice, premium, homeService, sort]);

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
  };

  return (
    <>
      <Nav />
      <div id="services" style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(36px,6vh,64px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Explore</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,60px)", marginTop: 10 }}>Find your next glow</h1>
        <p style={{ fontSize: 16, color: "#5a5457", marginTop: 8 }}>
          {loading ? "Searching…" : `${total} salon${total === 1 ? "" : "s"} match your search.`}
        </p>

        {/* FILTER BAR */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(1);
          }}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            marginTop: 24,
            padding: 14,
            borderRadius: 20,
            background: "rgba(255,255,255,.7)",
            border: "1px solid rgba(28,28,28,.07)",
            boxShadow: "0 20px 50px -30px rgba(28,28,28,.3)",
          }}
        >
          <input
            className="bb-input"
            style={{ flex: "1 1 220px", width: "auto" }}
            placeholder="Search salons or services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search"
          />
          <select style={selectStyle} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            <option value="">All cities</option>
            {(meta?.cities || []).map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All services</option>
            {(meta?.categories || []).map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select style={selectStyle} value={minRating} onChange={(e) => setMinRating(e.target.value)} aria-label="Minimum rating">
            <option value="">Any rating</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
          <select style={selectStyle} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} aria-label="Max price">
            <option value="">Any price</option>
            <option value="1500">Under Rs 1,500</option>
            <option value="3000">Under Rs 3,000</option>
            <option value="5000">Under Rs 5,000</option>
          </select>
          <select style={selectStyle} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            <option value="rating">Top rated</option>
            <option value="price">Lowest price</option>
            <option value="popularity">Most popular</option>
            <option value="newest">Newest</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#4a4446", cursor: "pointer" }}>
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} /> Premium
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#4a4446", cursor: "pointer" }}>
            <input type="checkbox" checked={homeService} onChange={(e) => setHomeService(e.target.checked)} /> Home service
          </label>
          <button
            type="submit"
            className="bb-btn"
            style={{ padding: "12px 26px", border: "none", borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Search
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 32, padding: 24, borderRadius: 20, background: "rgba(235,200,211,.25)", border: "1px solid rgba(176,106,133,.25)", fontSize: 15, color: "#4a4446" }}>
            {error}
          </div>
        )}

        <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 34 }}>
          {salons.map((s) => (
            <SalonCard key={s.slug} salon={s} />
          ))}
        </div>

        {!loading && !error && salons.length === 0 && (
          <p style={{ marginTop: 40, fontFamily: serif, fontSize: 24, color: "#5a5457", textAlign: "center" }}>
            No salons match those filters yet — try broadening your search.
          </p>
        )}

        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 40 }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => void load(p)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(28,28,28,.1)",
                  background: p === page ? "#1C1C1C" : "rgba(255,255,255,.8)",
                  color: p === page ? "#FAF8F7" : "#1C1C1C",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
