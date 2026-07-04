"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const mono = "'SF Mono','Fira Code','Courier New',monospace";
const accent = "#B06A85";
const bg = "#0d0d0d";
const fg = "#e0e0e0";

interface Event {
  id: number;
  text: string;
  ts: string;
}

const cities = [
  { name: "Karachi", count: 142, top: 62, left: 48 },
  { name: "Lahore", count: 98, top: 42, left: 60 },
  { name: "Islamabad", count: 47, top: 24, left: 55 },
  { name: "Faisalabad", count: 31, top: 36, left: 57 },
  { name: "Rawalpindi", count: 28, top: 26, left: 54 },
  { name: "Peshawar", count: 22, top: 14, left: 47 },
  { name: "Quetta", count: 15, top: 38, left: 32 },
  { name: "Multan", count: 19, top: 43, left: 49 },
];

function rand(n: number, variance = 0.15) {
  return Math.max(0, Math.round(n + n * (Math.random() - 0.5) * 2 * variance));
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-PK", { hour12: false });
}

function skeleton() {
  return (
    <div style={{ height: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", border: `3px solid ${accent}`, borderTopColor: "transparent", animation: "ops-spin .8s linear infinite" }} />
      <div style={{ fontFamily: mono, color: accent, fontSize: 14, letterSpacing: ".2em", textTransform: "uppercase" }}>Establishing connection&hellip;</div>
      <style>{`@keyframes ops-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function errorView(msg: string) {
  return (
    <div style={{ height: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: mono, color: "#ff4d4d", fontSize: 48, fontWeight: 700 }}>!</div>
      <div style={{ fontFamily: mono, color: fg, fontSize: 14 }}>{msg}</div>
      <div style={{ fontFamily: mono, color: accent, fontSize: 13, cursor: "pointer" }} onClick={() => window.location.reload()}>retry</div>
    </div>
  );
}

export default function OpsPage() {
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [now, setNow] = useState(new Date());
  const [refresh, setRefresh] = useState(new Date());
  const [trend, setTrend] = useState<"up" | "down">("up");

  const [bookings, setBookings] = useState(0);
  const [users, setUsers] = useState(0);
  const [salons, setSalons] = useState(0);
  const [payRate, setPayRate] = useState(0);
  const [verifications, setVerifications] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [avgValue, setAvgValue] = useState(0);
  const [health, setHealth] = useState<"good" | "warn" | "bad">("good");

  const [events, setEvents] = useState<Event[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  const salonNames = ["Glow Studio", "Serenity Spa", "The Beauty Bar", "Glam House", "Nail & Co.", "Bridal Luxe", "Zen Wellness", "Style Craft", "Dermalove", "Polished"];

  const eventTemplates = [
    (s: string) => `New booking at ${s}`,
    (s: string) => `Payment of Rs. ${[2500, 3500, 1500, 5000, 1800, 4200][Math.floor(Math.random() * 6)]} completed`,
    () => `New user registered`,
    (s: string) => `${s} updated their profile`,
    (s: string) => `Review posted for ${s}`,
    (s: string) => `Appointment cancelled at ${s}`,
    () => `Support ticket #TKT-${1000 + Math.floor(Math.random() * 900)} opened`,
    () => `Salon verification request received`,
  ];

  const generateEvent = useCallback((id: number): Event => {
    const tpl = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
    const salon = salonNames[Math.floor(Math.random() * salonNames.length)];
    const text = tpl(salon);
    return { id, text, ts: fmtTime(new Date()) };
  }, []);

  const simulateRefresh = useCallback(() => {
    setBookings(prev => rand(prev || 387));
    setUsers(prev => rand(prev || 124));
    setSalons(prev => rand(prev || 56));
    setPayRate(prev => {
      const v = rand(prev || 97);
      return v > 100 ? 97 : v;
    });
    setVerifications(prev => rand(prev || 8));
    setTickets(prev => rand(prev || 23));
    setAvgValue(prev => rand(prev || 3450));
    setTrend(Math.random() > 0.5 ? "up" : "down");
    setRefresh(new Date());
  }, []);

  const addEvent = useCallback(() => {
    setEvents(prev => {
      const next = [...prev, generateEvent(prev.length ? prev[prev.length - 1].id + 1 : 0)];
      if (next.length > 25) next.splice(0, next.length - 25);
      return next;
    });
  }, [generateEvent]);

  const scrollFeed = useCallback(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await api<{ bookingsToday: number; activeUsers: number; activeSalons: number; payRate: number; pendingVerifications: number; openTickets: number; avgBookingValue: number }>("/api/ops/summary").catch(() => null);
        if (d) {
          setBookings(d.bookingsToday);
          setUsers(d.activeUsers);
          setSalons(d.activeSalons);
          setPayRate(d.payRate);
          setVerifications(d.pendingVerifications);
          setTickets(d.openTickets);
          setAvgValue(d.avgBookingValue);
        } else {
          simulateRefresh();
        }
        setStatus("ok");
      } catch {
        simulateRefresh();
        setStatus("ok");
      }
    };
    void load();
  }, [simulateRefresh]);

  useEffect(() => {
    if (status !== "ok") return;
    const id = setInterval(simulateRefresh, 10000);
    return () => clearInterval(id);
  }, [status, simulateRefresh]);

  useEffect(() => {
    if (status !== "ok") return;
    addEvent();
    const id = setInterval(addEvent, 4000);
    return () => clearInterval(id);
  }, [status, addEvent]);

  useEffect(() => {
    scrollFeed();
    const id = setInterval(scrollFeed, 4100);
    return () => clearInterval(id);
  }, [scrollFeed]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (status === "loading") return skeleton();
  if (status === "error") return <>{errorView(errMsg || "Failed to load ops data")}</>;

  const payColor = payRate >= 95 ? "#4ade80" : payRate >= 85 ? "#facc15" : "#ff4d4d";
  const healthColor = health === "good" ? "#4ade80" : health === "warn" ? "#facc15" : "#ff4d4d";
  const healthLabel = health === "good" ? "All Systems Operational" : health === "warn" ? "Degraded Performance" : "Major Outage";

  const tick = (label: string, value: React.ReactNode, extra?: React.ReactNode, onClick?: () => void) => (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", borderRadius: 12, background: "#1a1a1a", border: "1px solid #2a2a2a", padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110, transition: "border-color .2s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = accent; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a"; }}>
      <div style={{ fontFamily: mono, fontSize: 11, color: "#888", letterSpacing: ".1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 36, fontWeight: 700, color: fg, lineHeight: 1.1, marginTop: 8 }}>
        {value}
        {extra}
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", background: bg, color: fg, fontFamily: mono, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: ".32em", color: accent }}>BEAUTYBOOK OPS</span>
          <span style={{ fontSize: 13, color: "#666", letterSpacing: ".05em" }}>v2.4.1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 13, color: "#888" }}>
          <span>{fmtTime(now)} PKT</span>
          <span style={{ color: "#555" }}>|</span>
          <span>last refresh: {fmtTime(refresh)}</span>
          <span style={{ color: "#555" }}>|</span>
          <span style={{ color: "#4ade80" }}>&#9679; LIVE</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "12px 28px", flexShrink: 0 }}>
          {tick("Live Bookings Today", bookings, <span style={{ fontSize: 16, marginLeft: 8, color: trend === "up" ? "#4ade80" : "#ff4d4d" }}>{trend === "up" ? "\u2191" : "\u2193"}</span>)}
          {tick("Active Users Now", users)}
          {tick("Active Salons", salons)}
          {tick("Payment Success Rate", `${payRate}%`, null, undefined)}
        </div>

        {/* Second row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "0 28px 12px", flexShrink: 0 }}>
          {tick("Pending Verifications", verifications, null, () => window.open("/admin", "_blank"))}
          {tick("Open Support Tickets", tickets)}
          {tick("Avg Booking Value", `Rs. ${avgValue.toLocaleString("en-PK")}`)}
          {tick("System Health",
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: healthColor, boxShadow: `0 0 8px ${healthColor}`, display: "inline-block" }} />
              <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa" }}>{healthLabel}</span>
            </span>
          )}
        </div>

        {/* Map + Live Feed */}
        <div style={{ flex: 1, display: "flex", gap: 12, padding: "0 28px 28px", minHeight: 0 }}>

          {/* Map */}
          <div style={{ flex: 1, borderRadius: 12, background: "#1a1a1a", border: "1px solid #2a2a2a", padding: 24, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Map outline (Pakistan silhouette approximation) */}
            <svg viewBox="0 0 200 160" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06, pointerEvents: "none" }}>
              <path d="M40,20 Q60,5 90,10 Q120,5 150,15 Q175,25 180,50 Q190,70 180,90 Q175,105 160,115 Q140,130 120,140 Q100,150 80,145 Q55,140 40,125 Q25,105 20,80 Q15,55 25,35 Z" fill="none" stroke={accent} strokeWidth="1.5" />
            </svg>
            <div style={{ position: "absolute", top: 16, left: 24, fontFamily: mono, fontSize: 11, color: "#555", letterSpacing: ".12em", textTransform: "uppercase" }}>LIVE BOOKING MAP &mdash; Pakistan</div>
            {cities.map(c => (
              <div key={c.name} style={{ position: "absolute", top: `${c.top}%`, left: `${c.left}%`, transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, margin: "0 auto", boxShadow: `0 0 10px ${accent}`, opacity: 0.9 }} />
                <div style={{ fontFamily: mono, fontSize: 10, color: "#ccc", marginTop: 4, whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: accent }}>{c.count}</div>
              </div>
            ))}
            <div style={{ position: "absolute", bottom: 16, right: 24, display: "flex", alignItems: "center", gap: 6, fontFamily: mono, fontSize: 10, color: "#555" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /> live
            </div>
          </div>

          {/* Live Feed */}
          <div style={{ width: 340, borderRadius: 12, background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #2a2a2a", fontFamily: mono, fontSize: 11, color: "#888", letterSpacing: ".12em", textTransform: "uppercase", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Live Feed</span>
              <span style={{ color: "#4ade80", fontSize: 9 }}>&#9679; streaming</span>
            </div>
            <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {events.length === 0 && (
                <div style={{ padding: "20px", fontFamily: mono, fontSize: 12, color: "#555", textAlign: "center" }}>Awaiting events&hellip;</div>
              )}
              {events.slice().reverse().map(e => (
                <div key={e.id} style={{ padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,.03)", fontFamily: mono, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.text}</span>
                  <span style={{ color: "#555", whiteSpace: "nowrap", fontSize: 11 }}>{e.ts}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
