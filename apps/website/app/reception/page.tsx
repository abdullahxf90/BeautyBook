"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

interface ReceptionBooking {
  id: string;
  code: string;
  startAt: string;
  durationMin: number;
  status: string;
  user: { name: string; phone: string };
  employee: { name: string } | null;
  items: { name: string; durationMin: number }[];
}

interface WalkInForm {
  name: string;
  phone: string;
  service: string;
  staff: string;
}

const statusColors: Record<string, string> = {
  CONFIRMED: "#666",
  ARRIVED: "#4a90d9",
  IN_PROGRESS: "#b06a85",
  COMPLETED: "#2a9d8f",
  CANCELLED: "#a33",
};

const statusActions: Record<string, { label: string; next: string }[]> = {
  CONFIRMED: [{ label: "Check In", next: "ARRIVED" }],
  ARRIVED: [{ label: "Start", next: "IN_PROGRESS" }],
  IN_PROGRESS: [{ label: "Complete", next: "COMPLETED" }],
};

const Skeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 24 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bb-skeleton" style={{ height: 100, borderRadius: 18 }} />
    ))}
  </div>
);

const now = () => new Date();
const todayStr = () => now().toISOString().slice(0, 10);
const timeStr = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

export default function ReceptionPage() {
  const [bookings, setBookings] = useState<ReceptionBooking[]>([]);
  const [stats, setStats] = useState({ total: 0, arrived: 0, inProgress: 0, completed: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWalkin, setShowWalkin] = useState(false);
  const [walkin, setWalkin] = useState<WalkInForm>({ name: "", phone: "", service: "", staff: "" });
  const [walkinMsg, setWalkinMsg] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [bkRes, stRes] = await Promise.all([
        api<{ bookings: ReceptionBooking[] }>(`/api/reception/bookings?date=${todayStr()}`),
        api<{ stats: typeof stats }>(`/api/reception/stats?date=${todayStr()}`),
      ]);
      setBookings(bkRes.bookings);
      setStats(stRes.stats);
      setError("");
    } catch {
      setError("Failed to load schedule. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => void fetchData(), 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/api/bookings/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      await fetchData();
    } catch {
      setError("Failed to update status.");
    }
  };

  const submitWalkin = async () => {
    if (!walkin.name || !walkin.phone) return;
    try {
      await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          salonId: "",
          employeeName: walkin.staff || undefined,
          items: [{ name: walkin.service || "Walk-in" }],
          startAt: now().toISOString(),
          customerName: walkin.name,
          customerPhone: walkin.phone,
        }),
      });
      setWalkinMsg("Walk-in added!");
      setWalkin({ name: "", phone: "", service: "", staff: "" });
      setShowWalkin(false);
      setTimeout(() => setWalkinMsg(""), 3000);
      await fetchData();
    } catch {
      setWalkinMsg("Could not add walk-in.");
    }
  };

  const filtered = bookings.filter((b) =>
    b.user.name.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div style={{ background: "#FAF8F7", minHeight: "100vh", fontFamily: "'Manrope',sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(20px,3vh,36px) clamp(16px,4vw,32px)" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#B06A85" }}>Reception Mode</span>
            <h1 style={{ fontFamily: serif, fontSize: "clamp(28px,4vw,40px)", fontWeight: 500, marginTop: 4 }}>
              {now().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h1>
          </div>
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none" }}>Back to Dashboard</Link>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 20 }}>
          {[
            { label: "Bookings", value: stats.total, color: "#1C1C1C" },
            { label: "Checked in", value: stats.arrived, color: "#4a90d9" },
            { label: "In progress", value: stats.inProgress, color: "#b06a85" },
            { label: "Completed", value: stats.completed, color: "#2a9d8f" },
          ].map((s) => (
            <div key={s.label} style={{ borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "clamp(22px,3vw,32px)", fontFamily: serif, fontWeight: 600, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 12, color: "#5a5457", marginTop: 2, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Add walk-in */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
          <input
            className="bb-input"
            placeholder="Search customer by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 16, padding: "14px 18px", borderRadius: 16 }}
          />
          <button
            onClick={() => { setShowWalkin(!showWalkin); setWalkinMsg(""); }}
            className="bb-btn"
            style={{ padding: "14px 22px", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            + Walk-in
          </button>
        </div>

        {/* Walk-in form */}
        {showWalkin && (
          <div style={{ marginTop: 14, borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>Add Walk-in</h3>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <input className="bb-input" placeholder="Name *" value={walkin.name} onChange={(e) => setWalkin({ ...walkin, name: e.target.value })} style={{ flex: "1 1 160px" }} />
              <input className="bb-input" placeholder="Phone *" value={walkin.phone} onChange={(e) => setWalkin({ ...walkin, phone: e.target.value })} style={{ flex: "1 1 160px" }} />
              <input className="bb-input" placeholder="Service" value={walkin.service} onChange={(e) => setWalkin({ ...walkin, service: e.target.value })} style={{ flex: "1 1 140px" }} />
              <input className="bb-input" placeholder="Staff" value={walkin.staff} onChange={(e) => setWalkin({ ...walkin, staff: e.target.value })} style={{ flex: "1 1 140px" }} />
              <button onClick={() => void submitWalkin()} className="bb-btn" style={{ padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add</button>
            </div>
            {walkinMsg && <p style={{ marginTop: 10, fontSize: 14, color: walkinMsg.includes("Could") ? "#a33" : "#2a9d8f", fontWeight: 600 }}>{walkinMsg}</p>}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 14, background: "rgba(163,51,51,.1)", color: "#a33", fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => void fetchData()} style={{ border: "none", background: "transparent", color: "#a33", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <Skeleton />}

        {/* Empty state */}
        {!loading && !error && sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", marginTop: 20 }}>
            <p style={{ fontSize: 18, color: "#5a5457", fontFamily: serif }}>No appointments today</p>
            <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Add a walk-in or check back later.</p>
          </div>
        )}

        {/* Timeline */}
        {!loading && sorted.length > 0 && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((b) => {
              const sc = statusColors[b.status] || "#666";
              const actions = statusActions[b.status] || [];
              return (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 20,
                    background: "#fff",
                    border: "1px solid rgba(28,28,28,.06)",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                    borderLeft: `5px solid ${sc}`,
                  }}
                >
                  {/* Time */}
                  <div style={{ textAlign: "center", minWidth: 70, flexShrink: 0 }}>
                    <p style={{ fontSize: 24, fontFamily: serif, fontWeight: 700, color: "#1C1C1C", lineHeight: 1.1 }}>{timeStr(b.startAt)}</p>
                    <p style={{ fontSize: 12, color: "#5a5457" }}>{b.durationMin} min</p>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#1C1C1C" }}>{b.user.name}</p>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 2 }}>
                      {b.items.map((i) => i.name).join(", ")}
                    </p>
                    {b.employee && (
                      <p style={{ fontSize: 13, color: "#B06A85", marginTop: 2, fontWeight: 600 }}>
                        with {b.employee.name}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      padding: "6px 14px",
                      borderRadius: 12,
                      background: `${sc}18`,
                      color: sc,
                    }}
                  >
                    {b.status.replace("_", " ")}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {actions.map((a) => (
                      <button
                        key={a.next}
                        onClick={() => void updateStatus(b.id, a.next)}
                        className="bb-btn"
                        style={{
                          padding: "10px 18px",
                          borderRadius: 14,
                          border: "none",
                          background: "#1C1C1C",
                          color: "#FAF8F7",
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                    {(b.status === "CONFIRMED" || b.status === "ARRIVED" || b.status === "IN_PROGRESS") && (
                      <button
                        onClick={() => void updateStatus(b.id, "CANCELLED")}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 14,
                          border: "1px solid rgba(163,51,51,.3)",
                          background: "transparent",
                          color: "#a33",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
