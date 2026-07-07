"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useEffect, useState, useCallback } from "react";
import { useLive } from "@/lib/useLive";

type Tab =
  | "dashboard" | "users" | "salons" | "bookings" | "payments"
  | "commissions" | "subscriptions" | "cms" | "ads" | "notifications"
  | "support" | "analytics" | "fraud" | "audit" | "roles"
  | "settings" | "feature-flags" | "api-keys" | "backups" | "security" | "system";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "salons", label: "Salons" },
  { id: "bookings", label: "Bookings" },
  { id: "payments", label: "Payments" },
  { id: "commissions", label: "Commissions" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "cms", label: "CMS" },
  { id: "ads", label: "Ads" },
  { id: "notifications", label: "Notifications" },
  { id: "support", label: "Support" },
  { id: "analytics", label: "Analytics" },
  { id: "fraud", label: "Fraud" },
  { id: "audit", label: "Audit Logs" },
  { id: "roles", label: "Roles" },
  { id: "settings", label: "Settings" },
  { id: "feature-flags", label: "Features" },
  { id: "api-keys", label: "API Keys" },
  { id: "backups", label: "Backups" },
  { id: "security", label: "Security" },
  { id: "system", label: "System" },
];

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1400, margin: "0 auto", padding: "40px 24px", fontFamily: "Hanken Grotesk, sans-serif", color: "#1C1C1C" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 700, fontFamily: "Space Grotesk, serif" },
  tabs: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32, borderBottom: "1px solid #E8E0DC", paddingBottom: 8 },
  tab: { padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#8A7F7A", borderRadius: 6, transition: "all .2s" },
  tabActive: { padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#B06A85", background: "#F5EDEA", borderRadius: 6 },
  card: { background: "#FFF", border: "1px solid #E8E0DC", borderRadius: 12, padding: 24, marginBottom: 24 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 },
  statCard: { background: "#FFF", border: "1px solid #E8E0DC", borderRadius: 12, padding: 20 },
  statValue: { fontSize: 28, fontWeight: 700, color: "#1C1C1C", marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#8A7F7A" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 12px", borderBottom: "2px solid #E8E0DC", color: "#8A7F7A", fontWeight: 600, whiteSpace: "nowrap" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #F0EBE7" },
  search: { width: "100%", padding: "10px 14px", border: "1px solid #E8E0DC", borderRadius: 8, fontSize: 14, marginBottom: 16, background: "#FFF" },
  badge: { display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btn: { padding: "6px 14px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#B06A85", color: "#FFF" },
  btnSm: { padding: "4px 10px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", marginRight: 4 },
  input: { padding: "8px 12px", border: "1px solid #E8E0DC", borderRadius: 8, fontSize: 13, width: "100%" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#1C1C1C", marginBottom: 6 },
};

function Badge({ color, bg, label }: { color: string; bg: string; label: string }) {
  return <span style={{ ...s.badge, color, background: bg }}>{label}</span>;
}

export default function AdminPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => { if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) router.push("/"); }, [user, loading, router]);
  useEffect(() => { if (token) setTokenReady(true); }, [token]);

  if (loading || !tokenReady || !user || !token) return null;

  return (
    <>
      <Nav />
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.h1}>Admin Control Center</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "#8A7F7A" }}>{user.name} ({user.role})</span>
            <Badge color="#2E7D32" bg="#E8F5E9" label="LIVE" />
          </div>
        </div>
        <div style={s.tabs}>
          {TABS.map((t) => (
            <button key={t.id} style={tab === t.id ? s.tabActive : s.tab} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <AdminDashboardSection token={token} active={tab === "dashboard"} />
        <UsersSection token={token} active={tab === "users"} />
        <SalonsSection token={token} active={tab === "salons"} />
        <BookingsSection token={token} active={tab === "bookings"} />
        <PaymentsSection token={token} active={tab === "payments"} />
        <CommissionsSection token={token} active={tab === "commissions"} />
        <SubscriptionsSection token={token} active={tab === "subscriptions"} />
        <CMSSection token={token} active={tab === "cms"} />
        <AdsSection token={token} active={tab === "ads"} />
        <NotificationsSection token={token} active={tab === "notifications"} />
        <SupportSection token={token} active={tab === "support"} />
        <AnalyticsSection token={token} active={tab === "analytics"} />
        <FraudSection token={token} active={tab === "fraud"} />
        <AuditSection token={token} active={tab === "audit"} />
        <RolesSection token={token} active={tab === "roles"} />
        <SettingsSection token={token} active={tab === "settings"} />
        <FeatureFlagsSection token={token} active={tab === "feature-flags"} />
        <ApiKeysSection token={token} active={tab === "api-keys"} />
        <BackupsSection token={token} active={tab === "backups"} />
        <SecuritySection token={token} active={tab === "security"} />
        <SystemSection token={token} active={tab === "system"} />
      </div>
      <Footer />
    </>
  );
}

// ────────────────────────────────────────────
// DASHBOARD
// ────────────────────────────────────────────

function AdminDashboardSection({ token, active }: { token: string; active: boolean }) {
  const [data, setData] = useState<any>(null);
  const fetch = useCallback(async () => {
    if (!active) return;
    try { const r = await api<any>(`/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }); setData(r); } catch {}
  }, [active, token]);
  useEffect(() => { fetch(); }, [fetch]);
  useLive(fetch, 20000);
  if (!active || !data) return null;
  const stats = [
    { label: "Total Users", value: data.totalUsers?.toLocaleString() },
    { label: "New Today", value: data.newUsersToday },
    { label: "Active Users", value: data.activeUsers },
    { label: "Total Salons", value: data.totalSalons },
    { label: "Pending", value: data.pendingSalons },
    { label: "Verified", value: data.verifiedSalons },
    { label: "Bookings", value: data.totalBookings?.toLocaleString() },
    { label: "Today", value: data.todayBookings },
    { label: "Monthly", value: data.monthlyBookings },
    { label: "Completed", value: data.completedBookings },
    { label: "Revenue", value: `PKR ${(data.revenue || 0).toLocaleString()}` },
    { label: "Open Tickets", value: data.ticketsOpen },
  ];
  return (
    <div>
      <div style={s.statGrid}>
        {stats.map((st) => (
          <div key={st.label} style={s.statCard}>
            <div style={s.statValue}>{st.value || "—"}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// USERS (shared sub-components)
// ────────────────────────────────────────────

function Pagination({ pagination, setPage }: { pagination: any; setPage: (p: number) => void }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
      {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => setPage(p)} style={{ ...s.btnSm, background: p === pagination.page ? "#B06A85" : "#F0EBE7", color: p === pagination.page ? "#FFF" : "#1C1C1C" }}>{p}</button>
      ))}
    </div>
  );
}

function UsersSection({ token, active }: { token: string; active: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const fetchUsers = useCallback(async () => {
    if (!active) return;
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (query) p.set("q", query);
    if (roleFilter) p.set("role", roleFilter);
    if (statusFilter) p.set("status", statusFilter);
    try { const r = await api<any>(`/api/admin/users?${p}`, { headers: { Authorization: `Bearer ${token}` } }); setUsers(r.users); setPagination(r.pagination); } catch {}
  }, [active, page, query, roleFilter, statusFilter, token]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  if (!active) return null;

  const selectUser = async (id: string) => {
    try { const r = await api<any>(`/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }); setSelected(r); } catch {}
  };
  const updateStatus = async (id: string, status: string) => {
    try { await api<any>(`/api/admin/users/${id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); fetchUsers(); } catch {}
  };
  const updateRole = async (id: string, role: string) => {
    try { await api<any>(`/api/admin/users/${id}/role`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ role }) }); fetchUsers(); } catch {}
  };

  if (selected) {
    const u = selected.user;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...s.btn, background: "#F0EBE7", color: "#1C1C1C", marginBottom: 20 }}>Back</button>
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{u.name}</h3>
              <p style={{ color: "#8A7F7A", margin: 0 }}>{u.email} • {u.phone || "No phone"}</p>
            </div>
            <Badge color={u.status === "ACTIVE" ? "#2E7D32" : u.status === "SUSPENDED" ? "#E65100" : "#C62828"} bg={u.status === "ACTIVE" ? "#E8F5E9" : u.status === "SUSPENDED" ? "#FFF3E0" : "#FFEBEE"} label={u.status} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {["overview", "security", "devices"].map((t) => (
              <button key={t} onClick={() => setDetailTab(t)} style={{ ...s.btnSm, background: detailTab === t ? "#B06A85" : "#F0EBE7", color: detailTab === t ? "#FFF" : "#1C1C1C", textTransform: "capitalize" }}>{t}</button>
            ))}
          </div>
          {detailTab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div><strong>Role:</strong> {u.role}</div>
                <div><strong>Email Verified:</strong> {u.emailVerified ? "Yes" : "No"}</div>
                <div><strong>Loyalty Points:</strong> {u.loyaltyPoints}</div>
                <div><strong>Created:</strong> {new Date(u.createdAt).toLocaleDateString()}</div>
                <div><strong>Last Login:</strong> {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <select onChange={(e) => updateRole(u.id, e.target.value)} defaultValue={u.role} style={{ ...s.input, width: "auto" }}>
                  {["CUSTOMER", "OWNER", "STAFF", "RECEPTIONIST", "MANAGER", "ADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {u.status === "ACTIVE" ? (
                  <button onClick={() => updateStatus(u.id, "SUSPENDED")} style={{ ...s.btn, background: "#E65100" }}>Suspend</button>
                ) : (
                  <button onClick={() => updateStatus(u.id, "ACTIVE")} style={{ ...s.btn, background: "#2E7D32" }}>Reactivate</button>
                )}
                {u.role !== "SUPER_ADMIN" && <button onClick={() => updateStatus(u.id, "BANNED")} style={{ ...s.btn, background: "#C62828" }}>Ban</button>}
              </div>
            </div>
          )}
          {detailTab === "security" && (
            <div>
              <h4 style={{ fontSize: 15, margin: "0 0 12px" }}>Login History</h4>
              {(selected.loginHistory || []).slice(0, 10).map((h: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0EBE7", fontSize: 13 }}>
                  <span>{h.action}</span>
                  <span style={{ color: "#8A7F7A" }}>{h.ipAddress || "—"} • {new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          {detailTab === "devices" && (
            <div>
              <h4 style={{ fontSize: 15, margin: "0 0 12px" }}>Devices ({selected.devices?.length || 0})</h4>
              {(selected.devices || []).map((d: any) => (
                <div key={d.id} style={{ padding: "8px 0", borderBottom: "1px solid #F0EBE7", fontSize: 13 }}>
                  {d.deviceName || d.deviceType || "Unknown"} • {d.browser || "—"} • Last: {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : "—"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input placeholder="Search name or email..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ ...s.search, margin: 0, flex: 1 }} />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ ...s.input, width: 140 }}>
          <option value="">All Roles</option>
          {["CUSTOMER", "OWNER", "STAFF", "ADMIN"].map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...s.input, width: 140 }}>
          <option value="">All Status</option>
          {["ACTIVE", "SUSPENDED", "BANNED", "DELETED"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Points</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td style={s.td}><strong>{u.name}</strong></td>
                <td style={s.td}>{u.email}</td>
                <td style={s.td}><Badge color="#5C3D2E" bg="#F5EDEA" label={u.role} /></td>
                <td style={s.td}><Badge color={u.status === "ACTIVE" ? "#2E7D32" : "#C62828"} bg={u.status === "ACTIVE" ? "#E8F5E9" : "#FFEBEE"} label={u.status} /></td>
                <td style={s.td}>{u.loyaltyPoints}</td>
                <td style={s.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={s.td}><button onClick={() => selectUser(u.id)} style={s.btnSm}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} setPage={setPage} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SALONS
// ────────────────────────────────────────────

function SalonsSection({ token, active }: { token: string; active: boolean }) {
  const [salons, setSalons] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [showVerifications, setShowVerifications] = useState(false);
  const fetchData = useCallback(async () => {
    if (!active) return;
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (query) p.set("q", query);
    if (statusFilter) p.set("status", statusFilter);
    try { const r = await api<any>(`/api/admin/salons?${p}`, { headers: { Authorization: `Bearer ${token}` } }); setSalons(r.salons); setPagination(r.pagination); } catch {}
    try { const v = await api<any>(`/api/admin/verifications`, { headers: { Authorization: `Bearer ${token}` } }); setVerifications(v.verifications); } catch {}
  }, [active, page, query, statusFilter, token]);
  useEffect(() => { fetchData(); }, [fetchData]);

  if (!active) return null;
  const verify = async (id: string) => { try { await api<any>(`/api/admin/salons/${id}/verify`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch {} };
  const toggleStatus = async (id: string, status: string) => { try { await api<any>(`/api/admin/salons/${id}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); fetchData(); } catch {} };
  const approveVerification = async (id: string) => { try { await api<any>(`/api/admin/verifications/${id}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch {} };
  const rejectVerification = async (id: string) => { try { await api<any>(`/api/admin/verifications/${id}/reject`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Rejected by admin" }) }); fetchData(); } catch {} };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input placeholder="Search salons..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ ...s.search, margin: 0, flex: 1 }} />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...s.input, width: 140 }}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={() => setShowVerifications(!showVerifications)} style={{ ...s.btn, background: "#5C3D2E" }}>Verifications ({verifications.length})</button>
      </div>
      {showVerifications && verifications.length > 0 && (
        <div style={s.card}>
          <h3 style={{ margin: "0 0 16px" }}>Pending Verifications</h3>
          {verifications.map((v: any) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F0EBE7" }}>
              <div>
                <strong>{v.salon?.name}</strong><br />
                <span style={{ fontSize: 12, color: "#8A7F7A" }}>{v.salon?.email} • Owner: {v.salon?.owner?.name}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveVerification(v.id)} style={{ ...s.btnSm, background: "#2E7D32", color: "#FFF" }}>Approve</button>
                <button onClick={() => rejectVerification(v.id)} style={{ ...s.btnSm, background: "#C62828", color: "#FFF" }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Owner</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Verified</th>
              <th style={s.th}>Bookings</th>
              <th style={s.th}>Services</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {salons.map((s: any) => (
              <tr key={s.id}>
                <td style={s.td}><strong>{s.name}</strong></td>
                <td style={s.td}>{s.owner?.name || "—"}</td>
                <td style={s.td}><Badge color={s.status === "SUSPENDED" ? "#E65100" : "#2E7D32"} bg={s.status === "SUSPENDED" ? "#FFF3E0" : "#E8F5E9"} label={s.status || "ACTIVE"} /></td>
                <td style={s.td}>{s.verified ? <Badge color="#2E7D32" bg="#E8F5E9" label="Yes" /> : <Badge color="#E65100" bg="#FFF3E0" label="No" />}</td>
                <td style={s.td}>{s._count?.bookings || 0}</td>
                <td style={s.td}>{s._count?.services || 0}</td>
                <td style={s.td}>
                  {!s.verified && <button onClick={() => verify(s.id)} style={{ ...s.btnSm, background: "#2E7D32", color: "#FFF" }}>Verify</button>}
                  <button onClick={() => toggleStatus(s.id, s.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")} style={{ ...s.btnSm, background: s.status === "SUSPENDED" ? "#2E7D32" : "#E65100", color: "#FFF" }}>{s.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} setPage={setPage} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// BOOKINGS
// ────────────────────────────────────────────

function BookingsSection({ token, active }: { token: string; active: boolean }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const fetchData = useCallback(async () => {
    if (!active) return;
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) p.set("status", statusFilter);
    try { const r = await api<any>(`/api/admin/bookings?${p}`, { headers: { Authorization: `Bearer ${token}` } }); setBookings(r.bookings); setPagination(r.pagination); } catch {}
  }, [active, page, statusFilter, token]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const cancelBooking = async (id: string) => { try { await api<any>(`/api/admin/bookings/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Cancelled by admin" }) }); fetchData(); } catch {} };
  if (!active) return null;

  if (selected) {
    const b = selected.booking;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...s.btn, background: "#F0EBE7", color: "#1C1C1C", marginBottom: 20 }}>Back</button>
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Booking {b.code}</h3>
              <p style={{ color: "#8A7F7A", margin: 0 }}>{b.salon?.name} • {new Date(b.dateTime || b.createdAt).toLocaleString()}</p>
            </div>
            <Badge color={b.status === "COMPLETED" ? "#2E7D32" : b.status === "CANCELLED" ? "#C62828" : "#E65100"} bg={b.status === "COMPLETED" ? "#E8F5E9" : b.status === "CANCELLED" ? "#FFEBEE" : "#FFF3E0"} label={b.status} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
            <div><strong>Customer:</strong> {b.user?.name} ({b.user?.email})</div>
            <div><strong>Total:</strong> PKR {b.total?.toLocaleString() || b.items?.reduce?.((s: number, i: any) => s + (i.price || 0), 0)?.toLocaleString()}</div>
            <div><strong>Payment:</strong> {b.payment?.status || "N/A"} via {b.payment?.method || "—"}</div>
          </div>
          {b.status !== "CANCELLED" && <button onClick={() => cancelBooking(b.id)} style={{ ...s.btn, background: "#C62828", marginTop: 16 }}>Cancel Booking</button>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...s.input, width: 200, marginBottom: 16 }}>
        <option value="">All Status</option>
        {["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"].map((st) => <option key={st} value={st}>{st}</option>)}
      </select>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Code</th>
              <th style={s.th}>Customer</th>
              <th style={s.th}>Salon</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Total</th>
              <th style={s.th}>Date</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b: any) => (
              <tr key={b.id}>
                <td style={s.td}>{b.code}</td>
                <td style={s.td}>{b.user?.name}</td>
                <td style={s.td}>{b.salon?.name}</td>
                <td style={s.td}><Badge color="#5C3D2E" bg="#F5EDEA" label={b.status} /></td>
                <td style={s.td}>PKR {b.total?.toLocaleString() || "—"}</td>
                <td style={s.td}>{new Date(b.createdAt).toLocaleDateString()}</td>
                <td style={s.td}><button onClick={() => setSelected({ booking: b })} style={s.btnSm}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} setPage={setPage} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// PAYMENTS
// ────────────────────────────────────────────

function PaymentsSection({ token, active }: { token: string; active: boolean }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const fetchData = useCallback(async () => {
    if (!active) return;
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter) p.set("status", statusFilter);
    try { const r = await api<any>(`/api/admin/payments?${p}`, { headers: { Authorization: `Bearer ${token}` } }); setPayments(r.payments); setPagination(r.pagination); setTotalRevenue(r.totalRevenue); } catch {}
  }, [active, page, statusFilter, token]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const refund = async (id: string) => { try { await api<any>(`/api/admin/payments/${id}/refund`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }); fetchData(); } catch {} };
  if (!active) return null;
  return (
    <div>
      <div style={s.statGrid}>
        <div style={s.statCard}><div style={s.statValue}>PKR {totalRevenue.toLocaleString()}</div><div style={s.statLabel}>Total Revenue</div></div>
      </div>
      <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...s.input, width: 200, marginBottom: 16 }}>
        <option value="">All Status</option>
        {["PENDING", "PAID", "REFUNDED", "FAILED"].map((st) => <option key={st} value={st}>{st}</option>)}
      </select>
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>ID</th>
              <th style={s.th}>Amount</th>
              <th style={s.th}>Method</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Booking</th>
              <th style={s.th}>Date</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p: any) => (
              <tr key={p.id}>
                <td style={s.td}>{p.id.slice(0, 8)}</td>
                <td style={s.td}>PKR {p.amount?.toLocaleString()}</td>
                <td style={s.td}>{p.method}</td>
                <td style={s.td}><Badge color={p.status === "PAID" ? "#2E7D32" : p.status === "REFUNDED" ? "#E65100" : "#C62828"} bg={p.status === "PAID" ? "#E8F5E9" : p.status === "REFUNDED" ? "#FFF3E0" : "#FFEBEE"} label={p.status} /></td>
                <td style={s.td}>{p.booking?.code || "—"}</td>
                <td style={s.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td style={s.td}>{p.status === "PAID" && <button onClick={() => refund(p.id)} style={{ ...s.btnSm, background: "#E65100", color: "#FFF" }}>Refund</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination pagination={pagination} setPage={setPage} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// COMMISSIONS
// ────────────────────────────────────────────

function CommissionsSection({ token, active }: { token: string; active: boolean }) {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "PERCENTAGE", rate: "10" });
  const fetchData = useCallback(async () => {
    if (!active) return;
    try { const r = await api<any>(`/api/admin/commissions`, { headers: { Authorization: `Bearer ${token}` } }); setRules(r.commissions); } catch {}
  }, [active, token]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const createRule = async () => {
    try { await api<any>(`/api/admin/commissions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...form, rate: parseFloat(form.rate) }) }); setShowForm(false); setForm({ name: "", type: "PERCENTAGE", rate: "10" }); fetchData(); } catch {}
  };
  const deleteRule = async (id: string) => { try { await api<any>(`/api/admin/commissions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch {} };
  if (!active) return null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Commission Rules</h3>
        <button onClick={() => setShowForm(!showForm)} style={s.btn}>{showForm ? "Cancel" : "Add Rule"}</button>
      </div>
      {showForm && (
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={s.label}>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={s.input}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed</option></select></div>
            <div><label style={s.label}>Rate</label><input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} style={s.input} type="number" /></div>
          </div>
          <button onClick={createRule} style={s.btn}>Create Rule</button>
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Rate</th>
              <th style={s.th}>Active</th>
              <th style={s.th}>Created</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r: any) => (
              <tr key={r.id}>
                <td style={s.td}><strong>{r.name}</strong></td>
                <td style={s.td}>{r.type}</td>
                <td style={s.td}>{r.type === "PERCENTAGE" ? `${r.rate}%` : `PKR ${r.rate}`}</td>
                <td style={s.td}><Badge color={r.active ? "#2E7D32" : "#8A7F7A"} bg={r.active ? "#E8F5E9" : "#F0EBE7"} label={r.active ? "Active" : "Inactive"} /></td>
                <td style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={s.td}><button onClick={() => deleteRule(r.id)} style={{ ...s.btnSm, background: "#C62828", color: "#FFF" }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SUBSCRIPTIONS
// ────────────────────────────────────────────

function SubscriptionsSection({ token, active }: { token: string; active: boolean }) {
  const [data, setData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", price: "0", durationDays: "30" });
  const fetchData = useCallback(async () => {
    if (!active) return;
    try { const r = await api<any>(`/api/admin/subscriptions`, { headers: { Authorization: `Bearer ${token}` } }); setData(r); } catch {}
  }, [active, token]);
  useEffect(() => { fetchData(); }, [fetchData]);
  const createPlan = async () => {
    try { await api<any>(`/api/admin/subscriptions/plans`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: parseInt(form.price), durationDays: parseInt(form.durationDays) }) }); setShowForm(false); fetchData(); } catch {}
  };
  if (!active) return null;
  return (
    <div>
      <div style={s.statGrid}>
        {data && <><div style={s.statCard}><div style={s.statValue}>{data.activeSubscriptions}</div><div style={s.statLabel}>Active Subscriptions</div></div><div style={s.statCard}><div style={s.statValue}>PKR {(data.totalRevenue || 0).toLocaleString()}</div><div style={s.statLabel}>Revenue</div></div></>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Membership Plans</h3>
        <button onClick={() => setShowForm(!showForm)} style={s.btn}>{showForm ? "Cancel" : "Add Plan"}</button>
      </div>
      {showForm && (
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={s.label}>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Slug</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Price (PKR)</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={s.input} type="number" /></div>
            <div><label style={s.label}>Duration (days)</label><input value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} style={s.input} type="number" /></div>
            <div style={{ gridColumn: "span 3" }}><label style={s.label}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={s.input} /></div>
          </div>
          <button onClick={createPlan} style={s.btn}>Create Plan</button>
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Name</th><th style={s.th}>Price</th><th style={s.th}>Duration</th><th style={s.th}>Active</th><th style={s.th}>Created</th></tr></thead>
          <tbody>
            {data?.plans?.map((p: any) => (
              <tr key={p.id}>
                <td style={s.td}><strong>{p.name}</strong></td>
                <td style={s.td}>PKR {p.price?.toLocaleString()}</td>
                <td style={s.td}>{p.durationDays} days</td>
                <td style={s.td}><Badge color={p.active ? "#2E7D32" : "#8A7F7A"} bg={p.active ? "#E8F5E9" : "#F0EBE7"} label={p.active ? "Active" : "Inactive"} /></td>
                <td style={s.td}>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// CMS
// ────────────────────────────────────────────

function CMSSection({ token, active }: { token: string; active: boolean }) {
  const [pages, setPages] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [cmsTab, setCmsTab] = useState<"pages" | "blogs" | "faqs" | "banners">("pages");
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/cms/pages`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setPages(r.pages)).catch(() => {});
    api<any>(`/api/admin/cms/blogs?page=1&limit=50`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setBlogs(r.blogs)).catch(() => {});
    api<any>(`/api/admin/cms/faqs`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setFaqs(r.faqs)).catch(() => {});
    api<any>(`/api/admin/cms/banners`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setBanners(r.banners)).catch(() => {});
  }, [active, token]);
  if (!active) return null;
  const tabs = ["pages", "blogs", "faqs", "banners"];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => <button key={t} onClick={() => setCmsTab(t as any)} style={{ ...s.btnSm, background: cmsTab === t ? "#B06A85" : "#F0EBE7", color: cmsTab === t ? "#FFF" : "#1C1C1C", textTransform: "capitalize", padding: "6px 16px" }}>{t}</button>)}
      </div>
      {cmsTab === "pages" && (
        <div style={s.card}>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Title</th><th style={s.th}>Slug</th><th style={s.th}>Published</th><th style={s.th}>Updated</th></tr></thead>
            <tbody>{pages.map((p: any) => <tr key={p.id}><td style={s.td}><strong>{p.title}</strong></td><td style={s.td}>{p.slug}</td><td style={s.td}><Badge color={p.published ? "#2E7D32" : "#8A7F7A"} bg={p.published ? "#E8F5E9" : "#F0EBE7"} label={p.published ? "Yes" : "No"} /></td><td style={s.td}>{new Date(p.updatedAt).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {cmsTab === "blogs" && (
        <div style={s.card}>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Title</th><th style={s.th}>Category</th><th style={s.th}>Published</th><th style={s.th}>Views</th><th style={s.th}>Date</th></tr></thead>
            <tbody>{blogs.map((b: any) => <tr key={b.id}><td style={s.td}><strong>{b.title}</strong></td><td style={s.td}>{b.category}</td><td style={s.td}><Badge color={b.published ? "#2E7D32" : "#8A7F7A"} bg={b.published ? "#E8F5E9" : "#F0EBE7"} label={b.published ? "Yes" : "No"} /></td><td style={s.td}>{b.views}</td><td style={s.td}>{new Date(b.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {cmsTab === "faqs" && (
        <div style={s.card}>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Question</th><th style={s.th}>Category</th><th style={s.th}>Published</th><th style={s.th}>Order</th></tr></thead>
            <tbody>{faqs.map((f: any) => <tr key={f.id}><td style={s.td}><strong>{f.question}</strong></td><td style={s.td}>{f.category}</td><td style={s.td}><Badge color={f.published ? "#2E7D32" : "#8A7F7A"} bg={f.published ? "#E8F5E9" : "#F0EBE7"} label={f.published ? "Yes" : "No"} /></td><td style={s.td}>{f.sortOrder}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {cmsTab === "banners" && (
        <div style={s.card}>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Title</th><th style={s.th}>Position</th><th style={s.th}>Active</th><th style={s.th}>Order</th></tr></thead>
            <tbody>{banners.map((b: any) => <tr key={b.id}><td style={s.td}><strong>{b.title || "Untitled"}</strong></td><td style={s.td}>{b.position}</td><td style={s.td}><Badge color={b.active ? "#2E7D32" : "#8A7F7A"} bg={b.active ? "#E8F5E9" : "#F0EBE7"} label={b.active ? "Active" : "Inactive"} /></td><td style={s.td}>{b.sortOrder}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// ADS
// ────────────────────────────────────────────

function AdsSection({ token, active }: { token: string; active: boolean }) {
  const [ads, setAds] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", placement: "HOME_BANNER" });
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/ads`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setAds(r.advertisements)).catch(() => {});
  }, [active, token]);
  const createAd = async () => { try { await api<any>(`/api/admin/ads`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(form) }); setShowForm(false); setForm({ title: "", imageUrl: "", placement: "HOME_BANNER" }); const r = await api<any>(`/api/admin/ads`, { headers: { Authorization: `Bearer ${token}` } }); setAds(r.advertisements); } catch {} };
  const deleteAd = async (id: string) => { try { await api<any>(`/api/admin/ads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); const r = await api<any>(`/api/admin/ads`, { headers: { Authorization: `Bearer ${token}` } }); setAds(r.advertisements); } catch {} };
  if (!active) return null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Advertisements</h3>
        <button onClick={() => setShowForm(!showForm)} style={s.btn}>{showForm ? "Cancel" : "Add Ad"}</button>
      </div>
      {showForm && (
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={s.label}>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Placement</label><select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} style={s.input}>{["HOME_BANNER","SIDEBAR","POPUP","FEATURED_SALON","SPONSORED_LISTING","SEARCH_RESULT","CATEGORY_PAGE"].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <button onClick={createAd} style={s.btn}>Create Advertisement</button>
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Title</th><th style={s.th}>Placement</th><th style={s.th}>Status</th><th style={s.th}>Impressions</th><th style={s.th}>Clicks</th><th style={s.th}>Created</th><th style={s.th}></th></tr></thead>
          <tbody>{ads.map((a: any) => <tr key={a.id}><td style={s.td}><strong>{a.title}</strong></td><td style={s.td}>{a.placement}</td><td style={s.td}><Badge color={a.status === "ACTIVE" ? "#2E7D32" : "#8A7F7A"} bg={a.status === "ACTIVE" ? "#E8F5E9" : "#F0EBE7"} label={a.status} /></td><td style={s.td}>{a._count?.impressions || 0}</td><td style={s.td}>{a._count?.clicks || 0}</td><td style={s.td}>{new Date(a.createdAt).toLocaleDateString()}</td><td style={s.td}><button onClick={() => deleteAd(a.id)} style={{ ...s.btnSm, background: "#C62828", color: "#FFF" }}>Delete</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────

function NotificationsSection({ token, active }: { token: string; active: boolean }) {
  const [form, setForm] = useState({ title: "", body: "", channel: "IN_APP", targetType: "ALL" });
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [result, setResult] = useState("");
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/notifications/logs`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setLogs(r.logs)).catch(() => {});
  }, [active, token]);
  const send = async () => {
    setSending(true);
    try { const r = await api<any>(`/api/admin/notifications/send`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(form) }); setResult(`Sent to ${r.sentCount} recipients`); } catch (e: any) { setResult(`Error: ${e.message}`); } finally { setSending(false); }
  };
  if (!active) return null;
  return (
    <div>
      <div style={s.card}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Send Notification</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={s.label}>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={s.input} /></div>
          <div><label style={s.label}>Channel</label><select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} style={s.input}><option value="IN_APP">In-App</option><option value="PUSH">Push</option><option value="EMAIL">Email</option><option value="SMS">SMS</option></select></div>
          <div style={{ gridColumn: "span 2" }}><label style={s.label}>Body</label><input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={s.input} /></div>
          <div><label style={s.label}>Target</label><select value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })} style={s.input}><option value="ALL">All Users</option><option value="ROLE">By Role</option><option value="CITY">By City</option></select></div>
        </div>
        <button onClick={send} disabled={sending} style={{ ...s.btn, opacity: sending ? 0.6 : 1 }}>{sending ? "Sending..." : "Send Notification"}</button>
        {result && <p style={{ marginTop: 8, fontSize: 13, color: result.startsWith("Error") ? "#C62828" : "#2E7D32" }}>{result}</p>}
      </div>
      <div style={s.card}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Recent Logs</h3>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Title</th><th style={s.th}>Channel</th><th style={s.th}>Status</th><th style={s.th}>Date</th></tr></thead>
          <tbody>{logs.slice(0, 20).map((l: any) => <tr key={l.id}><td style={s.td}><strong>{l.title}</strong></td><td style={s.td}>{l.channel}</td><td style={s.td}><Badge color="#5C3D2E" bg="#F5EDEA" label={l.status} /></td><td style={s.td}>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SUPPORT
// ────────────────────────────────────────────

function SupportSection({ token, active }: { token: string; active: boolean }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/support/tickets`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setTickets(r.tickets)).catch(() => {});
  }, [active, token]);
  const updateTicket = async (id: string, data: any) => { try { await api<any>(`/api/admin/support/tickets/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data) }); const r = await api<any>(`/api/admin/support/tickets`, { headers: { Authorization: `Bearer ${token}` } }); setTickets(r.tickets); } catch {} };
  const sendReply = async () => { if (!replyText.trim()) return; try { await api<any>(`/api/admin/support/tickets/${selected.id}/reply`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: replyText }) }); setReplyText(""); } catch {} };
  if (!active) return null;
  if (selected) return (
    <div>
      <button onClick={() => setSelected(null)} style={{ ...s.btn, background: "#F0EBE7", color: "#1C1C1C", marginBottom: 20 }}>Back</button>
      <div style={s.card}>
        <h3 style={{ margin: 0 }}>{selected.subject}</h3>
        <p style={{ color: "#8A7F7A", fontSize: 13 }}>{selected.user?.name} • {selected.category} • {new Date(selected.createdAt).toLocaleString()}</p>
        <p>{selected.description}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <select defaultValue={selected.status} onChange={(e) => updateTicket(selected.id, { status: e.target.value })} style={{ ...s.input, width: 160 }}>
            {["OPEN","IN_PROGRESS","WAITING_ON_CUSTOMER","RESOLVED","CLOSED"].map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <select defaultValue={selected.priority} onChange={(e) => updateTicket(selected.id, { priority: e.target.value })} style={{ ...s.input, width: 140 }}>
            {["LOW","MEDIUM","HIGH","URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 16 }}>
          <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a reply..." style={{ ...s.input, height: 80, resize: "vertical" }} />
          <button onClick={sendReply} style={{ ...s.btn, marginTop: 8 }}>Send Reply</button>
        </div>
      </div>
    </div>
  );
  return (
    <div style={s.card}>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Subject</th><th style={s.th}>User</th><th style={s.th}>Priority</th><th style={s.th}>Status</th><th style={s.th}>Date</th><th style={s.th}></th></tr></thead>
        <tbody>{tickets.map((t: any) => <tr key={t.id}><td style={s.td}><strong>{t.subject}</strong></td><td style={s.td}>{t.user?.name}</td><td style={s.td}><Badge color={t.priority === "URGENT" ? "#C62828" : t.priority === "HIGH" ? "#E65100" : "#8A7F7A"} bg={t.priority === "URGENT" ? "#FFEBEE" : t.priority === "HIGH" ? "#FFF3E0" : "#F0EBE7"} label={t.priority} /></td><td style={s.td}><Badge color={t.status === "OPEN" ? "#1565C0" : t.status === "RESOLVED" ? "#2E7D32" : "#E65100"} bg={t.status === "OPEN" ? "#E3F2FD" : t.status === "RESOLVED" ? "#E8F5E9" : "#FFF3E0"} label={t.status} /></td><td style={s.td}>{new Date(t.createdAt).toLocaleDateString()}</td><td style={s.td}><button onClick={() => setSelected(t)} style={s.btnSm}>View</button></td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────
// ANALYTICS
// ────────────────────────────────────────────

function AnalyticsSection({ token, active }: { token: string; active: boolean }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/analytics?days=30`, { headers: { Authorization: `Bearer ${token}` } }).then(setData).catch(() => {});
  }, [active, token]);
  if (!active) return null;
  return (
    <div>
      <div style={s.card}>
        <h3 style={{ margin: "0 0 16px" }}>Platform Overview</h3>
        <div style={s.statGrid}>
          <div style={s.statCard}><div style={s.statValue}>{data?.topServices?.length || 0}</div><div style={s.statLabel}>Top Services Tracked</div></div>
          <div style={s.statCard}><div style={s.statValue}>{data?.dailyStats?.length || 0}</div><div style={s.statLabel}>Days of Data</div></div>
        </div>
      </div>
      <div style={s.card}>
        <h3 style={{ margin: "0 0 16px" }}>Top Services</h3>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Service ID</th><th style={s.th}>Bookings</th><th style={s.th}>Revenue</th></tr></thead>
          <tbody>{(data?.topServices || []).map((s: any, i: number) => <tr key={i}><td style={s.td}>{s.serviceId}</td><td style={s.td}>{s._count?.id || 0}</td><td style={s.td}>PKR {s._sum?.price?.toLocaleString() || 0}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// FRAUD
// ────────────────────────────────────────────

function FraudSection({ token, active }: { token: string; active: boolean }) {
  const [rules, setRules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [fraudTab, setFraudTab] = useState<"rules" | "reports">("rules");
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/fraud/rules`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setRules(r.rules)).catch(() => {});
    api<any>(`/api/admin/fraud/reports`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setReports(r.reports)).catch(() => {});
  }, [active, token]);
  const updateReport = async (id: string, status: string) => { try { await api<any>(`/api/admin/fraud/reports/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); const r = await api<any>(`/api/admin/fraud/reports`, { headers: { Authorization: `Bearer ${token}` } }); setReports(r.reports); } catch {} };
  if (!active) return null;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["rules", "reports"].map((t) => <button key={t} onClick={() => setFraudTab(t as any)} style={{ ...s.btnSm, background: fraudTab === t ? "#B06A85" : "#F0EBE7", color: fraudTab === t ? "#FFF" : "#1C1C1C", textTransform: "capitalize", padding: "6px 16px" }}>{t}</button>)}
      </div>
      {fraudTab === "rules" && <div style={s.card}><table style={s.table}><thead><tr><th style={s.th}>Name</th><th style={s.th}>Type</th><th style={s.th}>Action</th><th style={s.th}>Active</th><th style={s.th}>Priority</th></tr></thead><tbody>{rules.map((r: any) => <tr key={r.id}><td style={s.td}><strong>{r.name}</strong></td><td style={s.td}>{r.type}</td><td style={s.td}>{r.action}</td><td style={s.td}><Badge color={r.active ? "#2E7D32" : "#8A7F7A"} bg={r.active ? "#E8F5E9" : "#F0EBE7"} label={r.active ? "Active" : "Inactive"} /></td><td style={s.td}>{r.priority}</td></tr>)}</tbody></table></div>}
      {fraudTab === "reports" && <div style={s.card}><table style={s.table}><thead><tr><th style={s.th}>Type</th><th style={s.th}>Entity</th><th style={s.th}>Severity</th><th style={s.th}>Status</th><th style={s.th}>Date</th><th style={s.th}></th></tr></thead><tbody>{reports.map((r: any) => <tr key={r.id}><td style={s.td}>{r.type}</td><td style={s.td}>{r.entityType}:{r.entityId?.slice(0, 8)}</td><td style={s.td}><Badge color={r.severity === "CRITICAL" ? "#C62828" : r.severity === "HIGH" ? "#E65100" : "#8A7F7A"} bg={r.severity === "CRITICAL" ? "#FFEBEE" : r.severity === "HIGH" ? "#FFF3E0" : "#F0EBE7"} label={r.severity} /></td><td style={s.td}>{r.status}</td><td style={s.td}>{new Date(r.createdAt).toLocaleDateString()}</td><td style={s.td}>{r.status === "PENDING_INVESTIGATION" && <button onClick={() => updateReport(r.id, "CONFIRMED")} style={{ ...s.btnSm, background: "#E65100", color: "#FFF" }}>Confirm</button>}</td></tr>)}</tbody></table></div>}
    </div>
  );
}

// ────────────────────────────────────────────
// AUDIT LOGS
// ────────────────────────────────────────────

function AuditSection({ token, active }: { token: string; active: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  useEffect(() => { if (!active) return; api<any>(`/api/admin/audit-logs?page=${page}&limit=30`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => { setLogs(r.logs); setPagination(r.pagination); }).catch(() => {}); }, [active, page, token]);
  if (!active) return null;
  return (
    <div style={s.card}>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Action</th><th style={s.th}>Entity</th><th style={s.th}>User</th><th style={s.th}>Details</th><th style={s.th}>Date</th></tr></thead>
        <tbody>{logs.map((l: any) => <tr key={l.id}><td style={s.td}><Badge color="#5C3D2E" bg="#F5EDEA" label={l.action} /></td><td style={s.td}>{l.entity}:{l.entityId?.slice(0, 8) || "—"}</td><td style={s.td}>{l.user?.name || "System"}</td><td style={{ ...s.td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.details || "—"}</td><td style={s.td}>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
      </table>
      <Pagination pagination={pagination} setPage={setPage} />
    </div>
  );
}

// ────────────────────────────────────────────
// ROLES
// ────────────────────────────────────────────

function RolesSection({ token, active }: { token: string; active: boolean }) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePerms, setRolePerms] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [showNewPerm, setShowNewPerm] = useState(false);
  const [newPerm, setNewPerm] = useState({ name: "", slug: "", group: "" });
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/permissions`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setPermissions(r.permissions)).catch(() => {});
    api<any>(`/api/admin/roles`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setRolePerms(r.rolePermissions)).catch(() => {});
  }, [active, token]);
  const savePermissions = async () => { try { await api<any>(`/api/admin/roles/${selectedRole}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ permissionIds: [] }) }); } catch {} };
  const createPerm = async () => { try { await api<any>(`/api/admin/permissions`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(newPerm) }); setShowNewPerm(false); setNewPerm({ name: "", slug: "", group: "" }); const r = await api<any>(`/api/admin/permissions`, { headers: { Authorization: `Bearer ${token}` } }); setPermissions(r.permissions); } catch {} };
  if (!active) return null;
  const grouped: Record<string, any[]> = {};
  permissions.forEach((p: any) => { const g = p.group || "Other"; if (!grouped[g]) grouped[g] = []; grouped[g].push(p); });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["ADMIN", "SUPER_ADMIN", "CUSTOMER", "OWNER", "STAFF", "MANAGER", "RECEPTIONIST"].map((r) => (
          <button key={r} onClick={() => setSelectedRole(r)} style={{ ...s.btnSm, background: selectedRole === r ? "#B06A85" : "#F0EBE7", color: selectedRole === r ? "#FFF" : "#1C1C1C" }}>{r}</button>
        ))}
        <button onClick={() => setShowNewPerm(!showNewPerm)} style={{ ...s.btnSm, background: "#5C3D2E", color: "#FFF" }}>{showNewPerm ? "Cancel" : "+ Permission"}</button>
      </div>
      {showNewPerm && (
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={s.label}>Name</label><input value={newPerm.name} onChange={(e) => setNewPerm({ ...newPerm, name: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Slug</label><input value={newPerm.slug} onChange={(e) => setNewPerm({ ...newPerm, slug: e.target.value })} style={s.input} /></div>
            <div><label style={s.label}>Group</label><input value={newPerm.group} onChange={(e) => setNewPerm({ ...newPerm, group: e.target.value })} style={s.input} /></div>
          </div>
          <button onClick={createPerm} style={{ ...s.btn, marginTop: 12 }}>Create</button>
        </div>
      )}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Permissions for {selectedRole}</h3>
        {Object.entries(grouped).map(([group, perms]) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, color: "#8A7F7A", margin: "0 0 8px", textTransform: "uppercase" }}>{group}</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {perms.map((p: any) => (
                <span key={p.id} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "#F5EDEA", color: "#5C3D2E" }}>{p.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────────

function SettingsSection({ token, active }: { token: string; active: boolean }) {
  const [settings, setSettings] = useState<any[]>([]);
  const [editKey, setEditKey] = useState("");
  const [editVal, setEditVal] = useState("");
  useEffect(() => { if (!active) return; api<any>(`/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setSettings(r.settings)).catch(() => {}); }, [active, token]);
  const saveSetting = async () => { if (!editKey) return; try { await api<any>(`/api/admin/settings/${editKey}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ value: editVal }) }); setEditKey(""); setEditVal(""); const r = await api<any>(`/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }); setSettings(r.settings); } catch {} };
  if (!active) return null;
  return (
    <div>
      {editKey && (
        <div style={s.card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Edit: {editKey}</h3>
          <input value={editVal} onChange={(e) => setEditVal(e.target.value)} style={s.input} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={saveSetting} style={s.btn}>Save</button>
            <button onClick={() => { setEditKey(""); setEditVal(""); }} style={{ ...s.btn, background: "#F0EBE7", color: "#1C1C1C" }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Key</th><th style={s.th}>Value</th><th style={s.th}>Group</th><th style={s.th}>Type</th><th style={s.th}></th></tr></thead>
          <tbody>{settings.map((setting: any) => <tr key={setting.id}><td style={{ ...s.td }}><strong>{setting.key}</strong></td><td style={{ ...s.td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{setting.value}</td><td style={{ ...s.td }}>{setting.group}</td><td style={{ ...s.td }}>{setting.type}</td><td style={{ ...s.td }}><button onClick={() => { setEditKey(setting.key); setEditVal(setting.value); }} style={s.btnSm}>Edit</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// FEATURE FLAGS
// ────────────────────────────────────────────

function FeatureFlagsSection({ token, active }: { token: string; active: boolean }) {
  const [flags, setFlags] = useState<any[]>([]);
  useEffect(() => { if (!active) return; api<any>(`/api/admin/feature-flags`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setFlags(r.featureFlags)).catch(() => {}); }, [active, token]);
  const toggle = async (key: string, enabled: boolean) => { try { await api<any>(`/api/admin/feature-flags/${key}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) }); const r = await api<any>(`/api/admin/feature-flags`, { headers: { Authorization: `Bearer ${token}` } }); setFlags(r.featureFlags); } catch {} };
  if (!active) return null;
  return (
    <div style={s.card}>
      <div style={{ display: "grid", gap: 12 }}>
        {flags.map((f: any) => (
          <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", border: "1px solid #E8E0DC", borderRadius: 8 }}>
            <div>
              <strong>{f.name}</strong>
              {f.description && <p style={{ margin: 0, fontSize: 12, color: "#8A7F7A" }}>{f.description}</p>}
            </div>
            <button onClick={() => toggle(f.key, f.enabled)} style={{ ...s.btnSm, background: f.enabled ? "#2E7D32" : "#C62828", color: "#FFF", width: 80 }}>{f.enabled ? "ON" : "OFF"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// API KEYS
// ────────────────────────────────────────────

function ApiKeysSection({ token, active }: { token: string; active: boolean }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState<any>(null);
  const [name, setName] = useState("");
  useEffect(() => { if (!active) return; api<any>(`/api/admin/api-keys`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setKeys(r.apiKeys)).catch(() => {}); }, [active, token]);
  const createKey = async () => { if (!name.trim()) return; try { const r = await api<any>(`/api/admin/api-keys`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); setNewKey(r.apiKey); setName(""); const keysR = await api<any>(`/api/admin/api-keys`, { headers: { Authorization: `Bearer ${token}` } }); setKeys(keysR.apiKeys); } catch {} };
  const deleteKey = async (id: string) => { try { await api<any>(`/api/admin/api-keys/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); const r = await api<any>(`/api/admin/api-keys`, { headers: { Authorization: `Bearer ${token}` } }); setKeys(r.apiKeys); } catch {} };
  if (!active) return null;
  return (
    <div>
      {newKey && (
        <div style={{ ...s.card, background: "#E8F5E9", border: "1px solid #2E7D32" }}>
          <h3 style={{ margin: "0 0 8px", color: "#2E7D32", fontSize: 16 }}>Key Created — Copy it now!</h3>
          <code style={{ display: "block", padding: 12, background: "#FFF", borderRadius: 8, fontSize: 13, wordBreak: "break-all" }}>{newKey.key}</code>
          <button onClick={() => setNewKey(null)} style={{ ...s.btn, background: "#2E7D32", marginTop: 8 }}>Dismiss</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New API key name..." style={{ ...s.search, margin: 0, flex: 1 }} />
        <button onClick={createKey} style={s.btn}>Generate Key</button>
      </div>
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Name</th><th style={s.th}>Prefix</th><th style={s.th}>Active</th><th style={s.th}>Last Used</th><th style={s.th}>Created</th><th style={s.th}></th></tr></thead>
          <tbody>{keys.map((k: any) => <tr key={k.id}><td style={s.td}><strong>{k.name}</strong></td><td style={s.td}><code>{k.prefix}...</code></td><td style={s.td}><Badge color={k.active ? "#2E7D32" : "#8A7F7A"} bg={k.active ? "#E8F5E9" : "#F0EBE7"} label={k.active ? "Active" : "Inactive"} /></td><td style={s.td}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}</td><td style={s.td}>{new Date(k.createdAt).toLocaleDateString()}</td><td style={s.td}><button onClick={() => deleteKey(k.id)} style={{ ...s.btnSm, background: "#C62828", color: "#FFF" }}>Revoke</button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// BACKUPS
// ────────────────────────────────────────────

function BackupsSection({ token, active }: { token: string; active: boolean }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (!active) return; api<any>(`/api/admin/backups`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setBackups(r.backups)).catch(() => {}); }, [active, token]);
  const createBackup = async () => { setCreating(true); try { await api<any>(`/api/admin/backups`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ type: "MANUAL", scope: "FULL" }) }); const r = await api<any>(`/api/admin/backups`, { headers: { Authorization: `Bearer ${token}` } }); setBackups(r.backups); } catch {} finally { setCreating(false); } };
  if (!active) return null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Backup History</h3>
        <button onClick={createBackup} disabled={creating} style={{ ...s.btn, opacity: creating ? 0.6 : 1 }}>{creating ? "Creating..." : "Create Backup"}</button>
      </div>
      <div style={s.card}>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Type</th><th style={s.th}>Scope</th><th style={s.th}>Status</th><th style={s.th}>Duration</th><th style={s.th}>Size</th><th style={s.th}>Date</th></tr></thead>
          <tbody>{backups.map((b: any) => <tr key={b.id}><td style={s.td}>{b.type}</td><td style={s.td}>{b.scope}</td><td style={s.td}><Badge color={b.status === "COMPLETED" ? "#2E7D32" : b.status === "FAILED" ? "#C62828" : "#E65100"} bg={b.status === "COMPLETED" ? "#E8F5E9" : b.status === "FAILED" ? "#FFEBEE" : "#FFF3E0"} label={b.status} /></td><td style={s.td}>{b.durationMs ? `${(b.durationMs / 1000).toFixed(1)}s` : "—"}</td><td style={s.td}>{b.fileSize ? `${(Number(b.fileSize) / 1024 / 1024).toFixed(1)} MB` : "—"}</td><td style={s.td}>{new Date(b.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SECURITY
// ────────────────────────────────────────────

function SecuritySection({ token, active }: { token: string; active: boolean }) {
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    if (!active) return;
    api<any>(`/api/admin/security`, { headers: { Authorization: `Bearer ${token}` } }).then(setData).catch(() => {});
    api<any>(`/api/admin/security/logs?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => setLogs(r.logs)).catch(() => {});
  }, [active, token]);
  if (!active) return null;
  return (
    <div>
      {data && <div style={s.statGrid}>
        <div style={s.statCard}><div style={s.statValue}>{data.failedLogins24h}</div><div style={s.statLabel}>Failed Logins (24h)</div></div>
        <div style={s.statCard}><div style={s.statValue}>{data.blockedIps}</div><div style={s.statLabel}>Blocked IPs</div></div>
        <div style={s.statCard}><div style={s.statValue}>{data.activeSessions}</div><div style={s.statLabel}>Active Sessions</div></div>
      </div>}
      <div style={s.card}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Security Events</h3>
        <table style={s.table}>
          <thead><tr><th style={s.th}>Action</th><th style={s.th}>User</th><th style={s.th}>IP</th><th style={s.th}>Date</th></tr></thead>
          <tbody>{logs.map((l: any) => <tr key={l.id}><td style={s.td}><Badge color={l.action === "LOGIN_SUCCESS" ? "#2E7D32" : "#C62828"} bg={l.action === "LOGIN_SUCCESS" ? "#E8F5E9" : "#FFEBEE"} label={l.action} /></td><td style={s.td}>{l.user?.name || "—"}</td><td style={s.td}>{l.ipAddress || "—"}</td><td style={s.td}>{new Date(l.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// SYSTEM
// ────────────────────────────────────────────

function SystemSection({ token, active }: { token: string; active: boolean }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (!active) return; api<any>(`/api/admin/system`, { headers: { Authorization: `Bearer ${token}` } }).then(setData).catch(() => {}); }, [active, token]);
  if (!active) return null;
  return (
    <div>
      <div style={s.statGrid}>
        {data && <>
          <div style={s.statCard}><div style={s.statValue}>{data.status}</div><div style={s.statLabel}>Server Status</div></div>
          <div style={s.statCard}><div style={s.statValue}>{Math.round(data.uptime || 0)}s</div><div style={s.statLabel}>Uptime</div></div>
          <div style={s.statCard}><div style={s.statValue}>{data.database?.status || "—"}</div><div style={s.statLabel}>Database</div></div>
          <div style={s.statCard}><div style={s.statValue}>{data.api24h}</div><div style={s.statLabel}>API Requests (24h)</div></div>
          <div style={s.statCard}><div style={s.statValue}>{data.errors24h}</div><div style={s.statLabel}>Errors (24h)</div></div>
          <div style={s.statCard}><div style={s.statValue}>{data.storage?.totalItems || 0}</div><div style={s.statLabel}>Media Items</div></div>
        </>}
      </div>
      {data?.memory && <div style={s.card}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Memory Usage</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div><strong>RSS:</strong> {Math.round((data.memory.rss || 0) / 1024 / 1024)} MB</div>
          <div><strong>Heap Total:</strong> {Math.round((data.memory.heapTotal || 0) / 1024 / 1024)} MB</div>
          <div><strong>Heap Used:</strong> {Math.round((data.memory.heapUsed || 0) / 1024 / 1024)} MB</div>
        </div>
      </div>}
    </div>
  );
}
