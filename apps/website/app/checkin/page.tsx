"use client";

import { useState } from "react";
import { api, BookingInfo } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

export default function CheckInPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleCheckIn = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setBooking(null);
    setSearched(false);
    try {
      const res = await api<{ booking: BookingInfo }>(`/api/bookings/lookup?code=${trimmed}`);
      setBooking(res.booking);
      setSearched(true);
    } catch {
      setError("Booking not found. Please check your code and try again.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#FAF8F7",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Manrope',sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#B06A85" }}>
          BeautyBook
        </span>
        <h1 style={{ fontFamily: serif, fontSize: "clamp(30px,5vw,42px)", fontWeight: 500, marginTop: 8, color: "#1C1C1C" }}>
          Check In
        </h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>
          Enter your booking code to check in
        </p>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            className="bb-input"
            placeholder="Booking code (e.g. BK-1234)"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); setBooking(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCheckIn(); }}
            style={{ textAlign: "center", fontSize: 20, padding: "16px 20px", borderRadius: 18, letterSpacing: ".04em", textTransform: "uppercase" }}
          />
          <button
            onClick={() => void handleCheckIn()}
            disabled={loading || !code.trim()}
            className="bb-btn"
            style={{
              padding: "16px 0",
              borderRadius: 18,
              border: "none",
              background: "#1C1C1C",
              color: "#FAF8F7",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading || !code.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Checking..." : "Check In"}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ marginTop: 32 }}>
            <div className="bb-skeleton" style={{ height: 16, width: "60%", margin: "0 auto 12px" }} />
            <div className="bb-skeleton" style={{ height: 14, width: "40%", margin: "0 auto" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 24, padding: "18px 22px", borderRadius: 18, background: "rgba(163,51,51,.1)", color: "#a33", fontSize: 14, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Success */}
        {booking && !loading && (
          <div style={{ marginTop: 32, borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 24 }}>✓</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#2a9d8f" }}>Checked in successfully!</span>
            </div>
            <div style={{ borderTop: "1px solid rgba(28,28,28,.06)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Customer" value={booking.salon.name} />
              <Row label="Salon" value={booking.salon.name} />
              <Row label="Time" value={new Date(booking.startAt).toLocaleString()} />
              <Row label="Code" value={booking.code} />
              {booking.employee && <Row label="Staff" value={booking.employee.name} />}
              <div>
                <p style={{ fontSize: 13, color: "#5a5457", marginBottom: 4 }}>Services</p>
                {booking.items.map((item, i) => (
                  <p key={i} style={{ fontSize: 15, fontWeight: 600, color: "#1C1C1C" }}>
                    {item.name} &middot; {item.durationMin} min
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Not found */}
        {searched && !booking && !error && !loading && (
          <p style={{ marginTop: 20, fontSize: 14, color: "#5a5457" }}>
            No booking found with that code.
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "#5a5457" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1C1C" }}>{value}</span>
    </div>
  );
}
