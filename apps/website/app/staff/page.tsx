"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

type Tab = "today" | "bookings" | "availability" | "performance" | "portfolio" | "leave";

interface StaffBooking {
  id: string;
  code: string;
  startAt: string;
  status: string;
  total: number;
  items: { name: string; price: number }[];
  user: { name: string; phone: string };
}

interface StaffPerformance {
  completedBookings: number;
  totalRevenue: number;
  avgRating: number;
  noShows: number;
}

interface PortfolioItem {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
}

interface LeaveRequest {
  id: string;
  date: string;
  reason: string;
  status: string;
  createdAt: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const statusStyle = (s: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".07em",
  textTransform: "uppercase",
  padding: "5px 10px",
  borderRadius: 10,
  background:
    s === "COMPLETED"
      ? "rgba(28,28,28,.08)"
      : s === "CANCELLED"
        ? "rgba(163,51,51,.12)"
        : s === "NO_SHOW"
          ? "rgba(163,51,51,.12)"
          : "rgba(212,175,55,.2)",
  color:
    s === "COMPLETED" ? "#1C1C1C" : s === "CANCELLED" || s === "NO_SHOW" ? "#a33" : "#7a5c14",
});

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  borderRadius: 18,
  background: "#fff",
  border: "1px solid rgba(28,28,28,.06)",
  padding: 22,
  ...extra,
});

const Skeleton = ({ h = 16, w = "100%", m = "0 0 12 0" }: { h?: number; w?: string | number; m?: string }) => (
  <div
    className="bb-skeleton"
    style={{
      height: h,
      width: w,
      margin: m,
    }}
  />
);

const Empty = ({ msg }: { msg: string }) => (
  <div style={{ textAlign: "center", padding: "48px 0" }}>
    <p style={{ fontSize: 15, color: "#5a5457" }}>{msg}</p>
  </div>
);

export default function StaffDashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [performance, setPerformance] = useState<StaffPerformance | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [availability, setAvailability] = useState<Record<number, { open: string; close: string; enabled: boolean }>>({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [portfolioCaption, setPortfolioCaption] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    if (!loading && (!user || (user.role !== "STAFF" && user.role !== "EMPLOYEE"))) {
      router.push("/");
    }
  }, [loading, user, router]);

  const apiCall = useCallback(
    async <T,>(path: string, opts: RequestInit & { token?: string | null } = {}): Promise<T | null> => {
      if (!token) return null;
      try {
        return await api<T>(path, { ...opts, token });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Request failed");
        return null;
      }
    },
    [token],
  );

  const loadAll = useCallback(async () => {
    setErr("");
    setLoaded(false);
    const [bkRes, perfRes, portRes, leaveRes] = await Promise.all([
      apiCall<{ bookings: StaffBooking[] }>("/api/staff/bookings"),
      apiCall<{ performance: StaffPerformance }>("/api/staff/performance"),
      apiCall<{ portfolio: PortfolioItem[] }>("/api/staff/portfolio"),
      apiCall<{ leaveRequests: LeaveRequest[] }>("/api/staff/leave-requests"),
    ]);
    if (bkRes) setBookings(bkRes.bookings);
    if (perfRes) setPerformance(perfRes.performance);
    if (portRes) setPortfolio(portRes.portfolio);
    if (leaveRes) setLeaveRequests(leaveRes.leaveRequests);
    setLoaded(true);
  }, [apiCall]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.startAt.startsWith(todayStr));

  const filteredBookings =
    bookingFilter === "all"
      ? bookings
      : bookingFilter === "upcoming"
        ? bookings.filter((b) => new Date(b.startAt) > new Date() && b.status !== "CANCELLED")
        : bookingFilter === "past"
          ? bookings.filter((b) => new Date(b.startAt) <= new Date() || b.status === "COMPLETED" || b.status === "CANCELLED")
          : bookings.filter((b) => b.status === bookingFilter);

  const addPortfolio = async () => {
    if (!portfolioUrl) return;
    const res = await apiCall<{ item: PortfolioItem }>("/api/staff/portfolio", {
      method: "POST",
      body: JSON.stringify({ url: portfolioUrl, caption: portfolioCaption || undefined }),
    });
    if (res) {
      setPortfolio((p) => [...p, res.item]);
      setPortfolioUrl("");
      setPortfolioCaption("");
      setMsg("Portfolio item added.");
    }
  };

  const deletePortfolio = async (id: string) => {
    const res = await apiCall<{ success: boolean }>(`/api/staff/portfolio/${id}`, { method: "DELETE" });
    if (res) {
      setPortfolio((p) => p.filter((i) => i.id !== id));
      setMsg("Portfolio item removed.");
    }
  };

  const submitLeave = async () => {
    if (!leaveDate || !leaveReason) return;
    const res = await apiCall<{ request: LeaveRequest }>("/api/staff/leave-requests", {
      method: "POST",
      body: JSON.stringify({ date: leaveDate, reason: leaveReason }),
    });
    if (res) {
      setLeaveRequests((r) => [res.request, ...r]);
      setLeaveDate("");
      setLeaveReason("");
      setMsg("Leave request submitted.");
    }
  };

  const toggleDay = (d: number) =>
    setAvailability((a) => ({
      ...a,
      [d]: a[d] ? { ...a[d], enabled: !a[d].enabled } : { open: "09:00", close: "18:00", enabled: false },
    }));

  const setDayHours = (d: number, field: "open" | "close", val: string) =>
    setAvailability((a) => ({
      ...a,
      [d]: { ...(a[d] || { open: "09:00", close: "18:00", enabled: true }), [field]: val },
    }));

  if (loading || !user) return null;

  const tabBtn = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      style={{
        padding: "9px 16px",
        borderRadius: 14,
        border: "none",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        background: tab === t ? "#1C1C1C" : "rgba(255,255,255,.7)",
        color: tab === t ? "#FAF8F7" : "#4a4446",
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Staff Dashboard</span>
            <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(30px,4vw,44px)", marginTop: 8 }}>
              Welcome, {user.name.split(" ")[0]}
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap", borderBottom: "1px solid rgba(28,28,28,.08)", paddingBottom: 14 }}>
          {tabBtn("today", "Today\u2019s Schedule")}
          {tabBtn("bookings", "My Bookings")}
          {tabBtn("availability", "Availability")}
          {tabBtn("performance", "Performance")}
          {tabBtn("portfolio", "Portfolio")}
          {tabBtn("leave", "Leave Requests")}
        </div>

        {msg && (
          <p
            style={{ marginTop: 16, fontSize: 14, color: "#B06A85", fontWeight: 600, cursor: "pointer" }}
            onClick={() => setMsg("")}
          >
            {msg}
          </p>
        )}
        {err && (
          <p
            style={{ marginTop: 16, fontSize: 14, color: "#a33", fontWeight: 600, cursor: "pointer" }}
            onClick={() => setErr("")}
          >
            {err}
          </p>
        )}

        {!loaded ? (
          <div style={{ marginTop: 24 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} h={80} m="0 0 14 0" />
            ))}
          </div>
        ) : (
          <>
            {/* Today's Schedule */}
            {tab === "today" && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 14, color: "#5a5457", marginBottom: 16 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
                {todayBookings.length === 0 ? (
                  <Empty msg="No appointments scheduled for today." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {todayBookings.map((b) => (
                      <div key={b.id} style={card({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 })}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 15 }}>{b.user.name}</p>
                          <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>
                            {new Date(b.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {b.items.map((i) => i.name).join(", ")} · {b.user.phone}
                          </p>
                        </div>
                        <span style={statusStyle(b.status)}>{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Bookings */}
            {tab === "bookings" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                  {[
                    { k: "all", l: "All" },
                    { k: "upcoming", l: "Upcoming" },
                    { k: "past", l: "Past" },
                    { k: "CONFIRMED", l: "Confirmed" },
                    { k: "COMPLETED", l: "Completed" },
                    { k: "CANCELLED", l: "Cancelled" },
                  ].map((f) => (
                    <button
                      key={f.k}
                      onClick={() => setBookingFilter(f.k)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 12,
                        border: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        background: bookingFilter === f.k ? "#1C1C1C" : "rgba(255,255,255,.7)",
                        color: bookingFilter === f.k ? "#FAF8F7" : "#4a4446",
                      }}
                    >
                      {f.l}
                    </button>
                  ))}
                </div>
                {filteredBookings.length === 0 ? (
                  <Empty msg="No bookings found." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredBookings.map((b) => (
                      <div key={b.id} style={card({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 })}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 15 }}>{b.user.name}</p>
                          <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>
                            {new Date(b.startAt).toLocaleString()} · {b.items.map((i) => i.name).join(", ")} · Code {b.code}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={statusStyle(b.status)}>{b.status}</span>
                          <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 6 }}>{rupees(b.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Availability */}
            {tab === "availability" && (
              <div style={{ marginTop: 24, ...card() }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Set your weekly availability</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Toggle days on/off and set your working hours.</p>
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  {DAYS.map((day, i) => {
                    const d = availability[i] || { open: "09:00", close: "18:00", enabled: true };
                    return (
                      <div
                        key={day}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 16px",
                          borderRadius: 14,
                          background: d.enabled ? "rgba(235,200,211,.08)" : "rgba(28,28,28,.03)",
                          border: "1px solid rgba(28,28,28,.06)",
                        }}
                      >
                        <button
                          onClick={() => toggleDay(i)}
                          style={{
                            width: 40,
                            height: 24,
                            borderRadius: 12,
                            border: "none",
                            background: d.enabled ? "#B06A85" : "rgba(28,28,28,.12)",
                            cursor: "pointer",
                            position: "relative",
                            transition: "background .2s",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: 2,
                              left: d.enabled ? 18 : 2,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "#fff",
                              transition: "left .2s",
                            }}
                          />
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 14, width: 90, flexShrink: 0 }}>{day}</span>
                        {d.enabled && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <input
                              type="time"
                              className="bb-input"
                              value={d.open}
                              onChange={(e) => setDayHours(i, "open", e.target.value)}
                              style={{ width: 110, fontSize: 13, padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(28,28,28,.12)", background: "#fff" }}
                            />
                            <span style={{ fontSize: 13, color: "#5a5457" }}>to</span>
                            <input
                              type="time"
                              className="bb-input"
                              value={d.close}
                              onChange={(e) => setDayHours(i, "close", e.target.value)}
                              style={{ width: 110, fontSize: 13, padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(28,28,28,.12)", background: "#fff" }}
                            />
                          </div>
                        )}
                        {!d.enabled && <span style={{ fontSize: 13, color: "#a33" }}>Day off</span>}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    void apiCall("/api/staff/availability", {
                      method: "PUT",
                      body: JSON.stringify({ availability }),
                    }).then(() => setMsg("Availability saved."));
                  }}
                  className="bb-btn"
                  style={{ marginTop: 18, padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Save availability
                </button>
              </div>
            )}

            {/* Performance */}
            {tab === "performance" && (
              <div style={{ marginTop: 24 }}>
                {!performance ? (
                  <Empty msg="Performance data not available yet." />
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                      {[
                        { label: "Bookings completed", value: String(performance.completedBookings) },
                        { label: "Total revenue", value: rupees(performance.totalRevenue) },
                        { label: "Average rating", value: performance.avgRating > 0 ? `${performance.avgRating.toFixed(1)} ★` : "No ratings" },
                        { label: "No-shows", value: String(performance.noShows) },
                      ].map((s) => (
                        <div key={s.label} style={card()}>
                          <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                          <p style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, ...card() }}>
                      <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Summary</h3>
                      <p style={{ fontSize: 14, color: "#5a5457", marginTop: 8 }}>
                        You&apos;ve completed {performance.completedBookings} bookings, earning {rupees(performance.totalRevenue)}. Keep up the great work!
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Portfolio */}
            {tab === "portfolio" && (
              <div style={{ marginTop: 24 }}>
                {portfolio.length === 0 ? (
                  <Empty msg="No portfolio items yet. Add your first one below." />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                    {portfolio.map((item) => (
                      <div key={item.id} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                        <div
                          style={{
                            height: 160,
                            background: `url(${item.url}) center/cover no-repeat`,
                            display: "flex",
                            alignItems: "flex-end",
                            backgroundSize: "cover",
                          }}
                        >
                          <span style={{ fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85", padding: "8px 10px" }}>{item.alt || "portfolio"}</span>
                        </div>
                        {item.caption && (
                          <p style={{ fontSize: 13, padding: "10px 12px", color: "#4a4446" }}>{item.caption}</p>
                        )}
                        <button
                          onClick={() => void deletePortfolio(item.id)}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "rgba(163,51,51,.08)",
                            color: "#a33",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "8px 0",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 20, borderRadius: 18, background: "rgba(235,200,211,.12)", padding: 22 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Add portfolio item</h3>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <input
                      className="bb-input"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="Image URL"
                      style={{ flex: "1 1 200px" }}
                    />
                    <input
                      className="bb-input"
                      value={portfolioCaption}
                      onChange={(e) => setPortfolioCaption(e.target.value)}
                      placeholder="Caption (optional)"
                      style={{ flex: "1 1 180px" }}
                    />
                    <button
                      onClick={() => void addPortfolio()}
                      className="bb-btn"
                      style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Requests */}
            {tab === "leave" && (
              <div style={{ marginTop: 24 }}>
                <div style={card()}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Request leave</h3>
                  <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
                    <input
                      type="date"
                      className="bb-input"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      style={{ flex: "1 1 180px" }}
                    />
                    <input
                      className="bb-input"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Reason for leave"
                      style={{ flex: "2 1 240px" }}
                    />
                    <button
                      onClick={() => void submitLeave()}
                      className="bb-btn"
                      style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      Submit
                    </button>
                  </div>
                </div>

                {leaveRequests.length === 0 ? (
                  <Empty msg="No leave requests yet." />
                ) : (
                  <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>History</h3>
                    {leaveRequests.map((r) => (
                      <div key={r.id} style={card({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 })}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600 }}>{new Date(r.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
                          <p style={{ fontSize: 13, color: "#5a5457", marginTop: 2 }}>{r.reason}</p>
                        </div>
                        <span style={statusStyle(r.status)}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
