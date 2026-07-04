"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
  color: "#B06A85",
};
const selectStyle = {
  border: "none",
  background: "transparent",
  fontSize: 16,
  fontWeight: 500,
  color: "#1C1C1C",
  width: "100%",
  outline: "none",
  cursor: "pointer",
  marginTop: 2,
};

export default function SearchBar({
  cities,
  categories,
}: {
  cities: string[];
  categories: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [city, setCity] = useState(cities[0] || "Karachi");
  const [category, setCategory] = useState("");

  const search = () => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (category) params.set("category", category);
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div
      style={{
        margin: "40px auto 0",
        maxWidth: 760,
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        padding: 10,
        borderRadius: 24,
        background: "rgba(255,255,255,.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(28,28,28,.07)",
        boxShadow: "0 24px 60px -28px rgba(28,28,28,.28)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 200px", textAlign: "left", padding: "10px 18px", borderRadius: 16 }}>
        <div style={labelStyle}>Location</div>
        <select style={selectStyle} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div style={{ width: 1, background: "rgba(28,28,28,.08)", alignSelf: "stretch", margin: "6px 0" }} />
      <div style={{ flex: "1 1 200px", textAlign: "left", padding: "10px 18px", borderRadius: 16 }}>
        <div style={labelStyle}>Service</div>
        <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Service category">
          <option value="">All services</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={search}
        className="bb-btn"
        style={{
          flex: "0 0 auto",
          padding: "0 34px",
          border: "none",
          borderRadius: 16,
          background: "#1C1C1C",
          color: "#FAF8F7",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 8px 20px rgba(28,28,28,.2)",
          minHeight: 54,
        }}
      >
        Search
      </button>
    </div>
  );
}
