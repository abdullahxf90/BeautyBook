"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

type Tab = "dashboard" | "users" | "salons" | "bookings" | "payments" | "verifications" | "audit" | "cms" | "settings" | "support" | "reports";

interface AdminUser { id: string; name: string; email: string; phone: string | null; role: string; emailVerified: boolean; loyaltyPoints: number; createdAt: string }
interface AdminSalon { id: string; name: string; slug: string; phone: string; email: string | null; verified: boolean; premium: boolean; rating: number; _count: { bookings: number }; area: { name: string; city: { name: string } } }
interface AdminBooking { id: string; code: string; startAt: string; status: string; total: number; user: { name: string }; salon: { name: string }; items: { name: string; price: number }[] }
interface AdminPayment { id: string; method: string; status: string; amount: number; booking: { code: string; salon: { name: string } } }
interface AdminVerification { id: string; status: string; salon: { name: string; slug: string; phone: string; owner: { name: string; email: string } } }

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState({ users: 0, salons: 0, bookings: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; entity: string; createdAt: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [msg, setMsg] = useState("");
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({ enableNewCheckout: true, enableReviews: true, enableReferrals: false, maintenanceMode: false, enableChat: true, enableLoyalty: true, enablePremium: false });
  const [supportTickets] = useState<{ id: string; subject: string; user: string; status: string; priority: string; assignedTo: string; date: string }[]>([
    { id: "TKT-001", subject: "Unable to complete booking", user: "Fatima A.", status: "Open", priority: "High", assignedTo: "Ali R.", date: "2026-07-04" },
    { id: "TKT-002", subject: "Payment not reflected", user: "Zara K.", status: "In Progress", priority: "Urgent", assignedTo: "Sara M.", date: "2026-07-03" },
    { id: "TKT-003", subject: "Salon verification delayed", user: "Ahmed S.", status: "Open", priority: "Medium", assignedTo: "Unassigned", date: "2026-07-02" },
    { id: "TKT-004", subject: "Wrong charges applied", user: "Hira N.", status: "Resolved", priority: "Low", assignedTo: "Ali R.", date: "2026-07-01" },
    { id: "TKT-005", subject: "Account deletion request", user: "Omar F.", status: "Closed", priority: "Low", assignedTo: "Sara M.", date: "2026-06-30" },
  ]);
  const [systemLogs] = useState<{ time: string; level: string; message: string }[]>([
    { time: "2026-07-05 09:23", level: "INFO", message: "Booking #BK-2391 completed" },
    { time: "2026-07-05 09:12", level: "WARN", message: "Payment gateway timeout on #PY-892" },
    { time: "2026-07-05 08:55", level: "ERROR", message: "Failed to send SMS notification" },
    { time: "2026-07-05 08:30", level: "INFO", message: "New user registered: saima@example.com" },
    { time: "2026-07-05 07:45", level: "INFO", message: "Salon verified: Glam Studio" },
  ]);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) router.push("/");
  }, [loading, user, router]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    const res = await api<{ stats: typeof stats; recentBookings: AdminBooking[] }>("/api/admin/stats", { token }).catch(() => ({ stats: { users: 0, salons: 0, bookings: 0, revenue: 0 }, recentBookings: [] }));
    setStats(res.stats);
    setRecentBookings(res.recentBookings);
  }, [token]);

  const loadUsers = useCallback(async (p: number) => {
    if (!token) return;
    const res = await api<{ users: AdminUser[]; pagination: { page: number; pages: number } }>(`/api/admin/users?page=${p}&limit=15`, { token }).catch(() => ({ users: [], pagination: { page: 1, pages: 1 } }));
    setUsers(res.users);
    setPage(res.pagination.page);
    setPages(res.pagination.pages);
  }, [token]);

  const loadSalons = useCallback(async (p: number) => {
    if (!token) return;
    const res = await api<{ salons: AdminSalon[]; pagination: { page: number; pages: number } }>(`/api/admin/salons?page=${p}&limit=15`, { token }).catch(() => ({ salons: [], pagination: { page: 1, pages: 1 } }));
    setSalons(res.salons);
    setPage(res.pagination.page);
    setPages(res.pagination.pages);
  }, [token]);

  const loadBookings = useCallback(async (p: number) => {
    if (!token) return;
    const res = await api<{ bookings: AdminBooking[]; pagination: { page: number; pages: number } }>(`/api/admin/bookings?page=${p}&limit=15`, { token }).catch(() => ({ bookings: [], pagination: { page: 1, pages: 1 } }));
    setBookings(res.bookings);
    setPage(res.pagination.page);
    setPages(res.pagination.pages);
  }, [token]);

  const loadPayments = useCallback(async (p: number) => {
    if (!token) return;
    const res = await api<{ payments: AdminPayment[]; pagination: { page: number; pages: number } }>(`/api/admin/payments?page=${p}&limit=15`, { token }).catch(() => ({ payments: [], pagination: { page: 1, pages: 1 } }));
    setPayments(res.payments);
    setPage(res.pagination.page);
    setPages(res.pagination.pages);
  }, [token]);

  const loadVerifications = useCallback(async () => {
    if (!token) return;
    const res = await api<{ verifications: AdminVerification[] }>("/api/admin/verifications", { token }).catch(() => ({ verifications: [] }));
    setVerifications(res.verifications);
  }, [token]);

  const loadAudit = useCallback(async (p: number) => {
    if (!token) return;
    const res = await api<{ logs: { id: string; action: string; entity: string; createdAt: string }[]; pagination: { page: number; pages: number } }>(`/api/admin/audit-logs?page=${p}&limit=20`, { token }).catch(() => ({ logs: [], pagination: { page: 1, pages: 1 } }));
    setAuditLogs(res.logs);
    setPage(res.pagination.page);
    setPages(res.pagination.pages);
  }, [token]);

  const changeRole = async (userId: string, role: string) => {
    if (!token) return;
    try { await api(`/api/admin/users/${userId}/role`, { method: "PATCH", token, body: JSON.stringify({ role }) }); setMsg("Role updated."); loadUsers(page); } catch {}
  };

  const verifySalon = async (salonId: string) => {
    if (!token) return;
    try { await api(`/api/admin/salons/${salonId}/verify`, { method: "PATCH", token }); setMsg("Salon verified."); loadSalons(page); } catch {}
  };

  const approveVerification = async (id: string) => {
    if (!token) return;
    try { await api(`/api/admin/verifications/${id}/approve`, { method: "POST", token }); setMsg("Verification approved."); loadVerifications(); } catch {}
  };

  const rejectVerification = async (id: string) => {
    if (!token) return;
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    try { await api(`/api/admin/verifications/${id}/reject`, { method: "POST", token, body: JSON.stringify({ reason }) }); setMsg("Verification rejected."); loadVerifications(); } catch {}
  };

  useEffect(() => { if (loading || !user) return; switch (tab) {
    case "dashboard": void loadDashboard(); break;
    case "users": void loadUsers(1); break;
    case "salons": void loadSalons(1); break;
    case "bookings": void loadBookings(1); break;
    case "payments": void loadPayments(1); break;
    case "verifications": void loadVerifications(); break;
    case "audit": void loadAudit(1); break;
    case "cms": break;
    case "settings": break;
    case "support": break;
    case "reports": break;
  } }, [tab, loading, user]);

  if (loading || !user) return null;

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => { setTab(t); setMsg(""); }} style={{ padding: "10px 18px", borderRadius: 16, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: tab === t ? "#1C1C1C" : "rgba(255,255,255,.7)", color: tab === t ? "#FAF8F7" : "#4a4446", boxShadow: tab === t ? "0 6px 18px rgba(28,28,28,.14)" : "none" }}>
      {label}
    </button>
  );

  const renderPagination = () => {
    if (pages <= 1) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => {
            switch (tab) {
              case "users": loadUsers(p); break;
              case "salons": loadSalons(p); break;
              case "bookings": loadBookings(p); break;
              case "payments": loadPayments(p); break;
              case "audit": loadAudit(p); break;
            }
          }} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(28,28,28,.1)", background: p === page ? "#1C1C1C" : "rgba(255,255,255,.8)", color: p === page ? "#FAF8F7" : "#1C1C1C", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{p}</button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Admin</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Platform admin</h1>

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", borderBottom: "1px solid rgba(28,28,28,.08)", paddingBottom: 14 }}>
          {tabBtn("dashboard", "Dashboard")}
          {tabBtn("users", "Users")}
          {tabBtn("salons", "Salons")}
          {tabBtn("bookings", "Bookings")}
          {tabBtn("payments", "Payments")}
          {tabBtn("verifications", "Verifications")}
          {tabBtn("audit", "Audit Log")}
          {tabBtn("cms", "CMS")}
          {tabBtn("settings", "Settings")}
          {tabBtn("support", "Support")}
          {tabBtn("reports", "Reports")}
        </div>

        {msg && <p style={{ marginTop: 16, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "Total users", value: String(stats.users) },
                { label: "Total salons", value: String(stats.salons) },
                { label: "Total bookings", value: String(stats.bookings) },
                { label: "Revenue", value: rupees(stats.revenue) },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                  <p style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, marginTop: 32 }}>Recent bookings</h3>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {recentBookings.map(b => (
                <div key={b.id} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 18px", display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span><strong>{b.user.name}</strong> at {b.salon.name} &middot; {b.code}</span>
                  <span style={{ color: "#5a5457" }}>{rupees(b.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                    <span style={{ fontSize: 13, color: "#5a5457", marginLeft: 10 }}>{u.email}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginLeft: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(235,200,211,.35)", color: "#B06A85" }}>{u.role}</span>
                  </div>
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(28,28,28,.1)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {["CUSTOMER", "OWNER", "STAFF", "RECEPTIONIST", "MANAGER", "ADMIN"].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {renderPagination()}
          </div>
        )}

        {/* Salons */}
        {tab === "salons" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {salons.map(s => (
                <div key={s.id} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span>
                    <span style={{ fontSize: 13, color: "#5a5457", marginLeft: 10 }}>{s.area.name}, {s.area.city.name}</span>
                    {!s.verified && <span style={{ fontSize: 11, marginLeft: 10, padding: "3px 8px", borderRadius: 8, background: "rgba(212,175,55,.2)", color: "#7a5c14" }}>Unverified</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`/salon/${s.slug}`} target="_blank" style={{ fontSize: 13, color: "#B06A85", textDecoration: "none" }}>View</a>
                    {!s.verified && <button onClick={() => verifySalon(s.id)} style={{ fontSize: 13, fontWeight: 600, color: "#B06A85", border: "none", background: "transparent", cursor: "pointer" }}>Verify</button>}
                  </div>
                </div>
              ))}
            </div>
            {renderPagination()}
          </div>
        )}

        {/* Bookings */}
        {tab === "bookings" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bookings.map(b => (
                <div key={b.id} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 18px", display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <div>
                    <strong>{b.user.name}</strong> @ {b.salon.name} &middot; Code {b.code} &middot; <span style={{ color: "#5a5457" }}>{new Date(b.startAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "4px 10px", borderRadius: 10, background: b.status === "COMPLETED" ? "rgba(28,28,28,.08)" : "rgba(212,175,55,.2)", color: b.status === "COMPLETED" ? "#1C1C1C" : "#7a5c14" }}>{b.status}</span>
                    <span style={{ fontFamily: serif, fontWeight: 600 }}>{rupees(b.total)}</span>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination()}
          </div>
        )}

        {/* Payments */}
        {tab === "payments" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {payments.map(p => (
                <div key={p.id} style={{ borderRadius: 14, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "14px 18px", display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <div>
                    {p.booking.salon.name} &middot; Code {p.booking.code} &middot; <span style={{ color: "#5a5457" }}>{p.method}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "4px 10px", borderRadius: 10, background: p.status === "PAID" ? "rgba(28,28,28,.08)" : "rgba(212,175,55,.2)", color: p.status === "PAID" ? "#1C1C1C" : "#7a5c14" }}>{p.status}</span>
                    <span style={{ fontWeight: 600 }}>{rupees(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination()}
          </div>
        )}

        {/* Verifications */}
        {tab === "verifications" && (
          <div style={{ marginTop: 24 }}>
            {verifications.length === 0 ? (
              <p style={{ fontSize: 15, color: "#5a5457" }}>No pending verifications.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {verifications.map(v => (
                  <div key={v.id} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 16 }}>{v.salon.name}</p>
                        <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>Owner: {v.salon.owner.name} ({v.salon.owner.email}) &middot; {v.salon.phone}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => approveVerification(v.id)} className="bb-btn" style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Approve</button>
                        <button onClick={() => rejectVerification(v.id)} style={{ padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Reject</button>
                      </div>
                    </div>
                    <a href={`/salon/${v.salon.slug}`} target="_blank" style={{ fontSize: 13, color: "#B06A85", textDecoration: "none", marginTop: 8, display: "inline-block" }}>View salon &rarr;</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log */}
        {tab === "audit" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {auditLogs.map(log => (
                <div key={log.id} style={{ borderRadius: 10, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: "12px 16px", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span><strong>{log.action}</strong> on {log.entity}</span>
                  <span style={{ color: "#5a5457" }}>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {renderPagination()}
          </div>
        )}

        {/* CMS Management */}
        {tab === "cms" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { label: "Pages", desc: "Manage static pages" },
                { label: "Blog Posts", desc: "Create & edit blog posts" },
                { label: "Banners", desc: "Homepage & promo banners" },
                { label: "FAQs", desc: "Manage frequently asked questions" },
                { label: "Testimonials", desc: "Customer testimonials" },
                { label: "Media Library", desc: "Images, videos & assets" },
              ].map(c => (
                <div key={c.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24, cursor: "pointer" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(235,200,211,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#B06A85" }}>{c.label[0]}</div>
                  <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 10 }}>{c.label}</p>
                  <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
              <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Feature flags</h3>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(featureFlags).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(28,28,28,.05)" }}>
                    <span style={{ fontSize: 14, fontFamily: "'Menlo',monospace", fontWeight: 500 }}>{key}</span>
                    <button onClick={() => setFeatureFlags({ ...featureFlags, [key]: !val })} style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: val ? "#1C1C1C" : "rgba(28,28,28,.15)", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                      <span style={{ position: "absolute", top: 3, left: val ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#FAF8F7", transition: "left .2s" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
              <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>System logs</h3>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                {systemLogs.map((log, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, fontSize: 13, padding: "8px 0", borderBottom: "1px solid rgba(28,28,28,.04)", fontFamily: "'Menlo',monospace" }}>
                    <span style={{ color: "#5a5457", minWidth: 140 }}>{log.time}</span>
                    <span style={{ fontWeight: 700, color: log.level === "ERROR" ? "#a33" : log.level === "WARN" ? "#7a5c14" : "#1C1C1C", minWidth: 50 }}>{log.level}</span>
                    <span style={{ color: "#4a4446" }}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Support Tickets */}
        {tab === "support" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.2fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.08)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457" }}>
                <span>Subject</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Assigned</span>
                <span>Date</span>
                <span>Action</span>
              </div>
              {supportTickets.map(t => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.2fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.04)", fontSize: 13, alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{t.subject}</span>
                    <span style={{ color: "#5a5457", marginLeft: 8, fontSize: 12 }}>{t.user}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 10, background: t.status === "Open" ? "rgba(212,175,55,.2)" : t.status === "Resolved" || t.status === "Closed" ? "rgba(28,28,28,.08)" : "rgba(176,106,133,.2)", color: t.status === "Open" ? "#7a5c14" : t.status === "Resolved" || t.status === "Closed" ? "#1C1C1C" : "#B06A85", display: "inline-block" }}>{t.status}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 10, background: t.priority === "Urgent" ? "rgba(163,51,51,.12)" : t.priority === "High" ? "rgba(212,175,55,.2)" : "rgba(28,28,28,.06)", color: t.priority === "Urgent" ? "#a33" : t.priority === "High" ? "#7a5c14" : "#5a5457", display: "inline-block" }}>{t.priority}</span>
                  <span style={{ color: "#4a4446" }}>{t.assignedTo}</span>
                  <span style={{ color: "#5a5457" }}>{t.date}</span>
                  <select style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(28,28,28,.1)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "Total revenue", value: rupees(stats.revenue) },
                { label: "Active users (30d)", value: String(stats.users) },
                { label: "Avg booking value", value: stats.bookings > 0 ? rupees(Math.round(stats.revenue / stats.bookings)) : rupees(0) },
                { label: "Conversion rate", value: "68%" },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                  <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { label: "Sales report", desc: "Daily, weekly & monthly sales" },
                { label: "Booking report", desc: "Booking trends & patterns" },
                { label: "Customer report", desc: "Customer acquisition & retention" },
                { label: "Salon report", desc: "Salon performance metrics" },
              ].map(r => (
                <a key={r.label} href="#" style={{ borderRadius: 18, background: "rgba(235,200,211,.12)", padding: 22, textDecoration: "none", display: "block", border: "1px solid rgba(176,106,133,.15)" }}>
                  <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: "#1C1C1C" }}>{r.label}</p>
                  <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>{r.desc}</p>
                  <span style={{ fontSize: 13, color: "#B06A85", fontWeight: 600, marginTop: 8, display: "inline-block" }}>View &rarr;</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}