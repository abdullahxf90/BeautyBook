"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

type Tab = "overview" | "bookings" | "services" | "employees" | "hours" | "gallery" | "verification" | "analytics" | "crm" | "inventory" | "marketing";

interface OwnerSalon { id: string; name: string; slug: string; phone: string; email: string | null; address: string; rating: number; verified: boolean; premium: boolean; _count: { bookings: number; reviews: number }; area: { name: string; city: { name: string } } }
interface OwnerService { id: string; name: string; description: string | null; price: number; durationMin: number; active: boolean; category: { name: string } }
interface OwnerEmployee { id: string; name: string; title: string; active: boolean }
interface OwnerBooking { id: string; code: string; startAt: string; status: string; total: number; items: { name: string; price: number }[]; user: { name: string; phone: string }; salon: { name: string } }

export default function SalonDashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [salons, setSalons] = useState<OwnerSalon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<string>("");
  const [services, setServices] = useState<OwnerService[]>([]);
  const [employees, setEmployees] = useState<OwnerEmployee[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [msg, setMsg] = useState("");
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [newSvc, setNewSvc] = useState({ name: "", price: "", durationMin: "30", categoryId: "" });
  const [newEmp, setNewEmp] = useState({ name: "", title: "" });
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "OWNER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))) {
      router.push("/");
    }
  }, [loading, user, router]);

  const loadSalons = useCallback(async () => {
    if (!token) return;
    const [salonRes, metaRes] = await Promise.all([
      api<{ salons: OwnerSalon[] }>("/api/owner/salons", { token }).catch(() => ({ salons: [] })),
      api<{ categories: { id: string; name: string; slug: string }[] }>("/api/meta").catch(() => ({ categories: [] })),
    ]);
    setSalons(salonRes.salons);
    setCategories(metaRes.categories);
    if (salonRes.salons.length > 0 && !selectedSalon) setSelectedSalon(salonRes.salons[0].id);
  }, [token, selectedSalon]);

  useEffect(() => { void loadSalons(); }, [loadSalons]);

  const loadDetails = useCallback(async () => {
    if (!token || !selectedSalon) return;
    const [svcRes, bkRes, anRes] = await Promise.all([
      api<{ salon: { services: OwnerService[]; employees: OwnerEmployee[] } }>(`/api/owner/salons/${selectedSalon}`, { token }).catch(() => ({ salon: { services: [], employees: [] } })),
      api<{ bookings: OwnerBooking[] }>("/api/owner/bookings", { token }).catch(() => ({ bookings: [] })),
      api<{ analytics: Record<string, any> }>("/api/owner/analytics", { token }).catch(() => ({ analytics: {} })),
    ]);
    setServices(svcRes.salon.services);
    setEmployees(svcRes.salon.employees);
    setBookings(bkRes.bookings);
    setAnalytics(anRes.analytics);
  }, [token, selectedSalon]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);

  const addService = async () => {
    if (!token || !selectedSalon) return;
    try {
      await api(`/api/owner/salons/${selectedSalon}/services`, { method: "POST", token, body: JSON.stringify({ name: newSvc.name, price: parseInt(newSvc.price), durationMin: parseInt(newSvc.durationMin), categoryId: newSvc.categoryId }) });
      setMsg("Service added.");
      setNewSvc({ name: "", price: "", durationMin: "30", categoryId: "" });
      await loadDetails();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add service");
    }
  };

  const addEmployee = async () => {
    if (!token || !selectedSalon) return;
    try {
      await api(`/api/owner/salons/${selectedSalon}/employees`, { method: "POST", token, body: JSON.stringify(newEmp) });
      setMsg("Employee added.");
      setNewEmp({ name: "", title: "" });
      await loadDetails();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to add employee");
    }
  };

  const deleteService = async (id: string) => {
    if (!token) return;
    try { await api(`/api/owner/services/${id}`, { method: "DELETE", token }); setMsg("Service removed."); await loadDetails(); } catch {}
  };

  const deleteEmployee = async (id: string) => {
    if (!token) return;
    try { await api(`/api/owner/employees/${id}`, { method: "DELETE", token }); setMsg("Employee removed."); await loadDetails(); } catch {}
  };

  const completeBooking = async (id: string) => {
    if (!token) return;
    try { await api(`/api/bookings/${id}/complete`, { method: "POST", token }); setMsg("Booking completed."); await loadDetails(); } catch {}
  };

  if (loading || !user) return null;

  const currentSalon = salons.find(s => s.id === selectedSalon);

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 16px", borderRadius: 14, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === t ? "#1C1C1C" : "rgba(255,255,255,.7)", color: tab === t ? "#FAF8F7" : "#4a4446" }}>
      {label}
    </button>
  );

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Salon Dashboard</span>
            <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(30px,4vw,44px)", marginTop: 8 }}>Manage your business</h1>
          </div>
          {salons.length > 0 && (
            <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {salons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {salons.length === 0 ? (
          <div style={{ marginTop: 48, textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: "#5a5457" }}>You don&apos;t have any salons listed yet. <a href="/partner" style={{ color: "#B06A85" }}>List your salon</a></p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap", borderBottom: "1px solid rgba(28,28,28,.08)", paddingBottom: 14 }}>
              {tabBtn("overview", "Overview")}
              {tabBtn("bookings", "Bookings")}
              {tabBtn("services", "Services")}
              {tabBtn("employees", "Staff")}
              {tabBtn("hours", "Hours")}
              {tabBtn("gallery", "Gallery")}
              {tabBtn("verification", "Verification")}
              {tabBtn("analytics", "Analytics")}
              {tabBtn("crm", "CRM")}
              {tabBtn("inventory", "Inventory")}
              {tabBtn("marketing", "Marketing")}
            </div>

            {msg && <p style={{ marginTop: 16, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}

            {/* Overview */}
            {tab === "overview" && currentSalon && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Rating", value: `â˜… ${currentSalon.rating.toFixed(1)}` },
                    { label: "Total bookings", value: String(currentSalon._count.bookings) },
                    { label: "Reviews", value: String(currentSalon._count.reviews) },
                    { label: "Status", value: currentSalon.verified ? "Verified" : "Unverified" },
                  ].map(s => (
                    <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                      <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                      <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>{currentSalon.name}</h3>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>{currentSalon.address}, {currentSalon.area.name}, {currentSalon.area.city.name}</p>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>{currentSalon.phone} Â· {currentSalon.email}</p>
                  <a href={`/salon/${currentSalon.slug}`} target="_blank" style={{ display: "inline-block", marginTop: 14, fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none" }}>View public profile â†’</a>
                </div>
              </div>
            )}

            {/* Bookings */}
            {tab === "bookings" && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                {bookings.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>No bookings yet.</p>}
                {bookings.filter(b => b.salon.name === currentSalon?.name).map(b => (
                  <div key={b.id} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15 }}>{b.user.name} Â· {b.user.phone}</p>
                        <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>{new Date(b.startAt).toLocaleString()} Â· Code {b.code} Â· {b.items.map(i => i.name).join(", ")}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", padding: "5px 10px", borderRadius: 10, background: b.status === "COMPLETED" ? "rgba(28,28,28,.08)" : b.status === "CANCELLED" ? "rgba(163,51,51,.12)" : "rgba(212,175,55,.2)", color: b.status === "COMPLETED" ? "#1C1C1C" : b.status === "CANCELLED" ? "#a33" : "#7a5c14" }}>{b.status}</span>
                        <p style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, marginTop: 6 }}>{rupees(b.total)}</p>
                      </div>
                    </div>
                    {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                      <button onClick={() => void completeBooking(b.id)} className="bb-btn" style={{ marginTop: 12, padding: "8px 16px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Mark completed</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Services */}
            {tab === "services" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {services.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</p>
                        <p style={{ fontSize: 13, color: "#5a5457" }}>{s.category?.name} Â· {s.durationMin} min{s.description ? ` Â· ${s.description}` : ""}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>{rupees(s.price)}</span>
                        <button onClick={() => void deleteService(s.id)} style={{ border: "none", background: "transparent", color: "#a33", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, borderRadius: 18, background: "rgba(235,200,211,.12)", padding: 22 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Add service</h3>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <input className="bb-input" value={newSvc.name} onChange={e => setNewSvc({ ...newSvc, name: e.target.value })} placeholder="Service name" style={{ flex: "1 1 160px" }} />
                    <input className="bb-input" type="number" value={newSvc.price} onChange={e => setNewSvc({ ...newSvc, price: e.target.value })} placeholder="Price (Rs)" style={{ width: 120 }} />
                    <input className="bb-input" type="number" value={newSvc.durationMin} onChange={e => setNewSvc({ ...newSvc, durationMin: e.target.value })} placeholder="Minutes" style={{ width: 100 }} />
                    <select className="bb-input" value={newSvc.categoryId} onChange={e => setNewSvc({ ...newSvc, categoryId: e.target.value })} style={{ width: 140 }}>
                      <option value="">Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => void addService()} className="bb-btn" style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* Employees */}
            {tab === "employees" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {employees.map(e => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</p>
                        <p style={{ fontSize: 13, color: "#5a5457" }}>{e.title}</p>
                      </div>
                      <button onClick={() => void deleteEmployee(e.id)} style={{ border: "none", background: "transparent", color: "#a33", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, borderRadius: 18, background: "rgba(235,200,211,.12)", padding: 22 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Add staff</h3>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <input className="bb-input" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} placeholder="Staff name" style={{ flex: "1 1 160px" }} />
                    <input className="bb-input" value={newEmp.title} onChange={e => setNewEmp({ ...newEmp, title: e.target.value })} placeholder="Title (e.g. Senior Stylist)" style={{ flex: "1 1 160px" }} />
                    <button onClick={() => void addEmployee()} className="bb-btn" style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* Hours */}
            {tab === "hours" && (
              <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Business hours</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Manage your salon&apos;s working hours from the API.</p>
                <div style={{ marginTop: 16, fontSize: 14, color: "#4a4446" }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => (
                    <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(28,28,28,.05)" }}>
                      <span style={{ fontWeight: 600 }}>{day}</span>
                      <span>{i === 0 ? "12:00 PM â€“ 9:00 PM" : "10:00 AM â€“ 9:00 PM"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {tab === "gallery" && (
              <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Salon gallery</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Upload photos of your salon, work, and team.</p>
                <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bb-ph" style={{ height: 140, borderRadius: 16, display: "flex", alignItems: "flex-end" }}>
                      <span style={{ fontFamily: "'Menlo',monospace", fontSize: 11, color: "#B06A85", padding: "8px 10px" }}>photo slot {i}</span>
                    </div>
                  ))}
                </div>
                <button className="bb-btn-ghost" style={{ marginTop: 16, padding: "12px 22px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Upload photos</button>
              </div>
            )}

            {/* Verification */}
            {tab === "verification" && (
              <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Business verification</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Submit your documents to get verified and build trust with customers.</p>
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  {["CNIC front", "CNIC back", "Business license", "Tax registration"].map((doc, i) => (
                    <div key={doc} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(28,28,28,.08)" }}>
                      <span style={{ fontSize: 14 }}>{doc}</span>
                      <span style={{ fontSize: 13, color: "#5a5457" }}>{i < 2 ? "Uploaded" : "Not uploaded"}</span>
                    </div>
                  ))}
                </div>
                <button className="bb-btn" style={{ marginTop: 18, padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Submit for verification</button>
              </div>
            )}

            {/* Analytics */}
            {tab === "analytics" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Total bookings", value: String(analytics.totalBookings ?? 0) },
                    { label: "Completed", value: String(analytics.completedBookings ?? 0) },
                    { label: "Revenue", value: rupees(analytics.revenue ?? 0) },
                    { label: "Reviews", value: String(analytics.totalReviews ?? 0) },
                  ].map(s => (
                    <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                      <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                      <p style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CRM */}
            {tab === "crm" && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Total customers", value: "248" },
                    { label: "Repeat rate", value: "72%" },
                    { label: "Avg visits/customer", value: "3.4" },
                    { label: "Birthdays this month", value: "12" },
                  ].map(s => (
                    <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                      <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                      <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Customer directory</h3>
                  <input className="bb-input" placeholder="Search customers..." style={{ marginTop: 12, width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(28,28,28,.1)", fontSize: 14 }} />
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { name: "Fatima Ahmed", phone: "0300-1234567", visits: 8, last: "2026-07-04" },
                      { name: "Zara Khan", phone: "0301-7654321", visits: 5, last: "2026-07-03" },
                      { name: "Sana Tariq", phone: "0302-9988776", visits: 12, last: "2026-07-01" },
                      { name: "Hina Raza", phone: "0303-5544332", visits: 3, last: "2026-06-28" },
                    ].map(c => (
                      <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(28,28,28,.06)" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                          <span style={{ fontSize: 13, color: "#5a5457", marginLeft: 10 }}>{c.phone}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#5a5457" }}>{c.visits} visits &middot; Last {c.last}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Inventory */}
            {tab === "inventory" && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Inventory</h3>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { name: "Hair color - Brown", sku: "HC-001", stock: 24, threshold: 10 },
                      { name: "Shampoo - Premium", sku: "SP-002", stock: 8, threshold: 10 },
                      { name: "Conditioner - Silk", sku: "SC-003", stock: 3, threshold: 10 },
                      { name: "Nail polish - Red", sku: "NP-004", stock: 45, threshold: 15 },
                      { name: "Face mask - Organic", sku: "FM-005", stock: 0, threshold: 10 },
                    ].map(p => {
                      const stockColor = p.stock === 0 ? "#a33" : p.stock < p.threshold ? "#7a5c14" : "#1C1C1C";
                      const stockBg = p.stock === 0 ? "rgba(163,51,51,.1)" : p.stock < p.threshold ? "rgba(212,175,55,.15)" : "rgba(28,28,28,.06)";
                      return (
                        <div key={p.sku} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(28,28,28,.06)" }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                            <span style={{ fontSize: 12, color: "#5a5457", marginLeft: 8 }}>{p.sku}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: stockBg, color: stockColor }}>{p.stock} in stock</span>
                            {p.stock < p.threshold && <span style={{ fontSize: 11, color: "#a33", fontWeight: 600 }}>Reorder!</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ borderRadius: 20, background: "rgba(235,200,211,.12)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Quick add product</h3>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <input className="bb-input" placeholder="Product name" style={{ flex: "1 1 160px" }} />
                    <input className="bb-input" placeholder="SKU" style={{ width: 100 }} />
                    <input className="bb-input" type="number" placeholder="Qty" style={{ width: 80 }} />
                    <button className="bb-btn" style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing */}
            {tab === "marketing" && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Campaigns</h3>
                  <button className="bb-btn" style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Create campaign</button>
                </div>
                <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.08)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457" }}>
                    <span>Campaign</span>
                    <span>Status</span>
                    <span>Reach</span>
                    <span>Action</span>
                  </div>
                  {[
                    { name: "Summer Glow Sale", status: "Active", reach: "1,240" },
                    { name: "New Client Offer", status: "Active", reach: "892" },
                    { name: "Referral Bonus", status: "Scheduled", reach: "-" },
                    { name: "Mega Monsoon", status: "Draft", reach: "-" },
                  ].map(c => (
                    <div key={c.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.04)", fontSize: 13, alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 10, background: c.status === "Active" ? "rgba(28,28,28,.08)" : c.status === "Scheduled" ? "rgba(212,175,55,.2)" : "rgba(28,28,28,.05)", color: c.status === "Active" ? "#1C1C1C" : c.status === "Scheduled" ? "#7a5c14" : "#5a5457", display: "inline-block", width: "fit-content" }}>{c.status}</span>
                      <span style={{ color: "#4a4446" }}>{c.reach}</span>
                      <button style={{ border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}>Edit</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                    <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Promotions</h4>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>50% off on first visit</p>
                    <p style={{ fontSize: 14, color: "#5a5457" }}>Refer a friend & get Rs 500 off</p>
                    <button style={{ marginTop: 10, border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>+ Add promotion</button>
                  </div>
                  <div style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                    <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Active offers</h4>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Buy 2 get 1 free on haircuts</p>
                    <p style={{ fontSize: 14, color: "#5a5457" }}>20% off on bridal packages</p>
                    <button style={{ marginTop: 10, border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}>+ Add offer</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
