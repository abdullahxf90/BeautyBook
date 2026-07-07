"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, API_URL, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLive } from "@/lib/useLive";

const serif = "'Space Grotesk',sans-serif";

type Tab = "overview" | "bookings" | "services" | "employees" | "hours" | "gallery" | "verification" | "analytics" | "crm" | "inventory" | "marketing";

interface OwnerSalon { id: string; name: string; slug: string; phone: string; email: string | null; address: string; rating: number; verified: boolean; premium: boolean; _count: { bookings: number; reviews: number }; area: { name: string; city: { name: string } } }
interface OwnerService { id: string; name: string; description: string | null; price: number; durationMin: number; active: boolean; category: { name: string } }
interface OwnerEmployee { id: string; name: string; title: string; active: boolean }
interface OwnerBooking { id: string; code: string; startAt: string; status: string; total: number; items: { name: string; price: number }[]; user: { name: string; phone: string }; salon: { name: string } }
interface WorkingHour { dayOfWeek: number; openMin: number; closeMin: number; closed: boolean }
interface SalonImage { id: string; url: string; alt: string | null }
interface SalonVerification { status: string; cnicNumber: string | null; licenseNumber: string | null; taxNumber: string | null }
interface CrmCustomerRow { id: string; name: string | null; phone: string | null; totalVisits: number; lastVisitAt: string | null }
interface ProductRow { id: string; name: string; sku: string | null; minStock: number | null; inventory: { quantity: number }[] }
interface CampaignRow { id: string; name: string; status: string; sent: number | null }
interface PromotionRow { id: string; title: string; active: boolean }
interface OfferRow { id: string; title: string; active: boolean }

const minToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const timeToMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function RegisterSalonForm({ onRegistered }: { onRegistered: () => void }) {
  const { token, adoptTokens } = useAuth();
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: "", description: "", phone: "", address: "", cityId: "", areaId: "", gender: "UNISEX" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api<{ cities: { id: string; name: string }[] }>("/api/locations/cities")
      .then((r) => setCities(r.cities))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.cityId) return setAreas([]);
    api<{ areas: { id: string; name: string }[] }>(`/api/locations/areas?cityId=${form.cityId}`)
      .then((r) => setAreas(r.areas))
      .catch(() => setAreas([]));
  }, [form.cityId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ salon: { id: string }; accessToken?: string; refreshToken?: string }>("/api/salons/register", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          phone: form.phone,
          address: form.address,
          areaId: form.areaId,
          gender: form.gender,
        }),
      });
      if (res.accessToken && res.refreshToken) await adoptTokens(res.accessToken, res.refreshToken);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register salon");
    } finally {
      setBusy(false);
    }
  };

  const selectStyle = { padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "#fff", fontSize: 14 };

  return (
    <div style={{ maxWidth: 560, margin: "48px auto 0" }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(28px,4vw,40px)" }}>List your salon</h2>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>Tell us about your business. Our team reviews every application before it goes live.</p>
      </div>
      <form onSubmit={submit} style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
        <input className="bb-input" placeholder="Salon name" value={form.name} onChange={set("name")} required minLength={2} aria-label="Salon name" />
        <textarea className="bb-input" placeholder="Describe your salon, services and what makes it special (min 10 characters)" value={form.description} onChange={set("description")} required minLength={10} rows={4} aria-label="Description" style={{ resize: "vertical", fontFamily: "inherit" }} />
        <input className="bb-input" type="tel" placeholder="Business phone (e.g. 03001234567)" value={form.phone} onChange={set("phone")} required minLength={10} aria-label="Business phone" />
        <input className="bb-input" placeholder="Street address" value={form.address} onChange={set("address")} required minLength={5} aria-label="Address" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <select value={form.cityId} onChange={set("cityId")} required aria-label="City" style={selectStyle}>
            <option value="">City</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={form.areaId} onChange={set("areaId")} required aria-label="Area" style={selectStyle} disabled={!form.cityId}>
            <option value="">Area</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <select value={form.gender} onChange={set("gender")} aria-label="Clientele" style={selectStyle}>
          <option value="UNISEX">Unisex</option>
          <option value="FEMALE">Ladies only</option>
          <option value="MALE">Gents only</option>
        </select>
        {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
        <button type="submit" disabled={busy} className="bb-btn" style={{ marginTop: 6, padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}

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
  const [hoursDraft, setHoursDraft] = useState<WorkingHour[]>([]);
  const [images, setImages] = useState<SalonImage[]>([]);
  const [verification, setVerification] = useState<SalonVerification | null>(null);
  const [verifForm, setVerifForm] = useState({ cnicNumber: "", licenseNumber: "", taxNumber: "" });
  const [uploading, setUploading] = useState(false);
  const [crmCustomers, setCrmCustomers] = useState<CrmCustomerRow[]>([]);
  const [crmStats, setCrmStats] = useState<{ total: number; repeat: number; avgVisits: number }>({ total: 0, repeat: 0, avgVisits: 0 });
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [newProd, setNewProd] = useState({ name: "", sku: "", qty: "" });
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [offersList, setOffersList] = useState<OfferRow[]>([]);
  const [newCampaign, setNewCampaign] = useState("");
  const [newPromo, setNewPromo] = useState("");
  const [newOffer, setNewOffer] = useState("");

  useEffect(() => {
    // Logged-in customers may view this page to submit a partner application;
    // registering their first salon upgrades them to OWNER.
    if (!loading && !user) {
      router.push("/login?next=/salon-dashboard");
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
    const [svcRes, bkRes, anRes, crmRes, invRes, campRes, promRes, offerRes] = await Promise.all([
      api<{ salon: { services: OwnerService[]; employees: OwnerEmployee[]; workingHours: WorkingHour[]; images: SalonImage[]; verification: SalonVerification | null } }>(`/api/owner/salons/${selectedSalon}`, { token }).catch(() => ({ salon: { services: [], employees: [], workingHours: [], images: [], verification: null } })),
      api<{ bookings: OwnerBooking[] }>("/api/owner/bookings", { token }).catch(() => ({ bookings: [] })),
      api<{ analytics: Record<string, any> }>("/api/owner/analytics", { token }).catch(() => ({ analytics: {} })),
      api<{ customers: CrmCustomerRow[]; total: number }>(`/api/crm/customers?salonId=${selectedSalon}&limit=50`, { token }).catch(() => ({ customers: [], total: 0 })),
      api<{ products: ProductRow[] }>(`/api/inventory/products?salonId=${selectedSalon}&limit=50`, { token }).catch(() => ({ products: [] })),
      api<{ campaigns: CampaignRow[] }>(`/api/marketing/campaigns?salonId=${selectedSalon}`, { token }).catch(() => ({ campaigns: [] })),
      api<{ promotions: PromotionRow[] }>(`/api/marketing/promotions?salonId=${selectedSalon}`, { token }).catch(() => ({ promotions: [] })),
      api<{ offers: OfferRow[] }>(`/api/marketing/offers?salonId=${selectedSalon}`, { token }).catch(() => ({ offers: [] })),
    ]);
    setServices(svcRes.salon.services);
    setEmployees(svcRes.salon.employees);
    setBookings(bkRes.bookings);
    setAnalytics(anRes.analytics);
    setImages(svcRes.salon.images ?? []);
    setVerification(svcRes.salon.verification ?? null);
    setHoursDraft(
      svcRes.salon.workingHours?.length
        ? svcRes.salon.workingHours
        : dayNames.map((_, i) => ({ dayOfWeek: i, openMin: 600, closeMin: 1260, closed: false })),
    );
    setCrmCustomers(crmRes.customers);
    const repeat = crmRes.customers.filter((c) => c.totalVisits > 1).length;
    const visits = crmRes.customers.reduce((s, c) => s + c.totalVisits, 0);
    setCrmStats({ total: crmRes.total, repeat, avgVisits: crmRes.customers.length ? Math.round((visits / crmRes.customers.length) * 10) / 10 : 0 });
    setProducts(invRes.products);
    setCampaigns(campRes.campaigns);
    setPromotions(promRes.promotions);
    setOffersList(offerRes.offers);
  }, [token, selectedSalon]);

  useEffect(() => { void loadDetails(); }, [loadDetails]);
  useLive(loadDetails, 15000);

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

  const saveHours = async () => {
    if (!token || !selectedSalon) return;
    try {
      await api(`/api/owner/salons/${selectedSalon}/hours`, { method: "PUT", token, body: JSON.stringify(hoursDraft) });
      setMsg("Business hours saved.");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to save hours"); }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!token || !selectedSalon || !files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("images", f));
      const res = await fetch(`${API_URL}/api/uploads/salon/${selectedSalon}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Upload failed");
      setMsg("Photos uploaded.");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const deleteImage = async (imageId: string) => {
    if (!token || !selectedSalon) return;
    try {
      await api(`/api/uploads/salon/${selectedSalon}/images/${imageId}`, { method: "DELETE", token });
      setMsg("Photo removed.");
      await loadDetails();
    } catch {}
  };

  const submitVerification = async () => {
    if (!token || !selectedSalon) return;
    try {
      await api(`/api/owner/salons/${selectedSalon}/verification`, {
        method: "PUT", token,
        body: JSON.stringify({
          cnicNumber: verifForm.cnicNumber || undefined,
          licenseNumber: verifForm.licenseNumber || undefined,
          taxNumber: verifForm.taxNumber || undefined,
        }),
      });
      setMsg("Verification submitted — our team will review it shortly.");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to submit verification"); }
  };

  const addProduct = async () => {
    if (!token || !selectedSalon || !newProd.name) return;
    try {
      const { product } = await api<{ product: { id: string } }>("/api/inventory/products", {
        method: "POST", token,
        body: JSON.stringify({ salonId: selectedSalon, name: newProd.name, sku: newProd.sku || undefined, unitPrice: 0, sellingPrice: 0, unit: "pcs", minStock: 5 }),
      });
      const qty = parseInt(newProd.qty) || 0;
      if (qty > 0) {
        await api(`/api/inventory/stock/${product.id}?salonId=${selectedSalon}`, { method: "PUT", token, body: JSON.stringify({ quantity: qty }) });
      }
      setMsg("Product added.");
      setNewProd({ name: "", sku: "", qty: "" });
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to add product"); }
  };

  const createCampaign = async () => {
    if (!token || !selectedSalon || !newCampaign) return;
    try {
      await api("/api/marketing/campaigns", { method: "POST", token, body: JSON.stringify({ salonId: selectedSalon, name: newCampaign, type: "PUSH", status: "DRAFT" }) });
      setMsg("Campaign created as draft.");
      setNewCampaign("");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to create campaign"); }
  };

  const toggleCampaign = async (c: CampaignRow) => {
    if (!token) return;
    try {
      await api(`/api/marketing/campaigns/${c.id}/status`, { method: "PUT", token, body: JSON.stringify({ status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }) });
      await loadDetails();
    } catch {}
  };

  const createPromotion = async () => {
    if (!token || !selectedSalon || !newPromo) return;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    try {
      await api("/api/marketing/promotions", { method: "POST", token, body: JSON.stringify({ salonId: selectedSalon, title: newPromo, type: "PERCENTAGE", value: 10, startAt: now.toISOString(), endAt: end.toISOString() }) });
      setMsg("Promotion added (10% off, 30 days — edit anytime).");
      setNewPromo("");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to add promotion"); }
  };

  const createOffer = async () => {
    if (!token || !selectedSalon || !newOffer) return;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    try {
      await api("/api/marketing/offers", { method: "POST", token, body: JSON.stringify({ salonId: selectedSalon, title: newOffer, originalPrice: 0, offerPrice: 0, startAt: now.toISOString(), endAt: end.toISOString() }) });
      setMsg("Offer added.");
      setNewOffer("");
      await loadDetails();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed to add offer"); }
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
          <RegisterSalonForm onRegistered={() => void loadSalons()} />
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
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Set your opening hours — customers only see slots inside them.</p>
                <div style={{ marginTop: 16, fontSize: 14, color: "#4a4446" }}>
                  {hoursDraft.map((h, i) => (
                    <div key={h.dayOfWeek} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(28,28,28,.05)", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, minWidth: 90 }}>{dayNames[h.dayOfWeek]}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="time" value={minToTime(h.openMin)} disabled={h.closed} onChange={(e) => setHoursDraft(d => d.map((x, xi) => xi === i ? { ...x, openMin: timeToMin(e.target.value) } : x))} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(28,28,28,.12)", fontSize: 13 }} />
                        <span>–</span>
                        <input type="time" value={minToTime(h.closeMin)} disabled={h.closed} onChange={(e) => setHoursDraft(d => d.map((x, xi) => xi === i ? { ...x, closeMin: timeToMin(e.target.value) } : x))} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(28,28,28,.12)", fontSize: 13 }} />
                        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <input type="checkbox" checked={h.closed} onChange={(e) => setHoursDraft(d => d.map((x, xi) => xi === i ? { ...x, closed: e.target.checked } : x))} />
                          Closed
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={saveHours} className="bb-btn" style={{ marginTop: 18, padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save hours</button>
              </div>
            )}

            {/* Gallery */}
            {tab === "gallery" && (
              <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Salon gallery</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Upload photos of your salon, work, and team.</p>
                <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }}>
                  {images.length === 0 && (
                    <p style={{ fontSize: 14, color: "#5a5457", gridColumn: "1 / -1" }}>No photos yet — upload your first ones below.</p>
                  )}
                  {images.map(img => (
                    <div key={img.id} style={{ position: "relative", height: 140, borderRadius: 16, overflow: "hidden", background: "rgba(235,200,211,.2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt || "salon photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => void deleteImage(img.id)} title="Remove photo" style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, border: "none", background: "rgba(28,28,28,.65)", color: "#FAF8F7", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
                <label className="bb-btn-ghost" style={{ display: "inline-block", marginTop: 16, padding: "12px 22px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? "Uploading…" : "Upload photos"}
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={uploading} onChange={(e) => { void uploadPhotos(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
            )}

            {/* Verification */}
            {tab === "verification" && (
              <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Business verification</h3>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>
                  {currentSalon?.verified
                    ? "Your salon is verified — the badge is live on your profile."
                    : verification
                      ? `Application status: ${verification.status}. You can update and resubmit below.`
                      : "Submit your business details to get verified and build trust with customers."}
                </p>
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  {([
                    ["CNIC number", "cnicNumber", verification?.cnicNumber],
                    ["Business license number", "licenseNumber", verification?.licenseNumber],
                    ["Tax registration (NTN)", "taxNumber", verification?.taxNumber],
                  ] as Array<[string, keyof typeof verifForm, string | null | undefined]>).map(([label, key, current]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderRadius: 14, border: "1px solid rgba(28,28,28,.08)", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, minWidth: 170 }}>{label}</span>
                      <input
                        className="bb-input"
                        placeholder={current ? `On file: ${current}` : "Not provided"}
                        value={verifForm[key]}
                        onChange={(e) => setVerifForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ flex: "1 1 200px", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(28,28,28,.1)", fontSize: 13 }}
                      />
                    </div>
                  ))}
                </div>
                <button onClick={submitVerification} className="bb-btn" style={{ marginTop: 18, padding: "12px 22px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Submit for verification</button>
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
                    { label: "Total customers", value: String(crmStats.total) },
                    { label: "Repeat customers", value: String(crmStats.repeat) },
                    { label: "Avg visits/customer", value: String(crmStats.avgVisits) },
                  ].map(s => (
                    <div key={s.label} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                      <p style={{ fontSize: 13, color: "#5a5457" }}>{s.label}</p>
                      <p style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 6 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Customer directory</h3>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {crmCustomers.length === 0 && (
                      <p style={{ fontSize: 14, color: "#5a5457" }}>No customers yet — profiles appear here automatically after their first booking.</p>
                    )}
                    {crmCustomers.map(c => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(28,28,28,.06)" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name || "Customer"}</span>
                          {c.phone && <span style={{ fontSize: 13, color: "#5a5457", marginLeft: 10 }}>{c.phone}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: "#5a5457" }}>
                          {c.totalVisits} visits{c.lastVisitAt ? ` · Last ${new Date(c.lastVisitAt).toLocaleDateString()}` : ""}
                        </div>
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
                    {products.length === 0 && (
                      <p style={{ fontSize: 14, color: "#5a5457" }}>No products yet — add your first below to start tracking stock.</p>
                    )}
                    {products.map(p => {
                      const stock = p.inventory?.[0]?.quantity ?? 0;
                      const threshold = p.minStock ?? 5;
                      const stockColor = stock === 0 ? "#a33" : stock < threshold ? "#7a5c14" : "#1C1C1C";
                      const stockBg = stock === 0 ? "rgba(163,51,51,.1)" : stock < threshold ? "rgba(212,175,55,.15)" : "rgba(28,28,28,.06)";
                      return (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(28,28,28,.06)" }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                            {p.sku && <span style={{ fontSize: 12, color: "#5a5457", marginLeft: 8 }}>{p.sku}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: stockBg, color: stockColor }}>{stock} in stock</span>
                            {stock < threshold && <span style={{ fontSize: 11, color: "#a33", fontWeight: 600 }}>Reorder!</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ borderRadius: 20, background: "rgba(235,200,211,.12)", padding: 24 }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Quick add product</h3>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <input className="bb-input" placeholder="Product name" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} style={{ flex: "1 1 160px" }} />
                    <input className="bb-input" placeholder="SKU" value={newProd.sku} onChange={e => setNewProd(p => ({ ...p, sku: e.target.value }))} style={{ width: 100 }} />
                    <input className="bb-input" type="number" placeholder="Qty" value={newProd.qty} onChange={e => setNewProd(p => ({ ...p, qty: e.target.value }))} style={{ width: 80 }} />
                    <button onClick={() => void addProduct()} className="bb-btn" style={{ padding: "12px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing */}
            {tab === "marketing" && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 600 }}>Campaigns</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="bb-input" placeholder="Campaign name" value={newCampaign} onChange={e => setNewCampaign(e.target.value)} style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(28,28,28,.1)", fontSize: 13 }} />
                    <button onClick={() => void createCampaign()} className="bb-btn" style={{ padding: "10px 18px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Create campaign</button>
                  </div>
                </div>
                <div style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.08)", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#5a5457" }}>
                    <span>Campaign</span>
                    <span>Status</span>
                    <span>Reach</span>
                    <span>Action</span>
                  </div>
                  {campaigns.length === 0 && (
                    <p style={{ padding: "16px 18px", fontSize: 14, color: "#5a5457" }}>No campaigns yet — create your first above.</p>
                  )}
                  {campaigns.map(c => (
                    <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(28,28,28,.04)", fontSize: 13, alignItems: "center" }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 10, background: c.status === "ACTIVE" ? "rgba(28,28,28,.08)" : c.status === "DRAFT" ? "rgba(28,28,28,.05)" : "rgba(212,175,55,.2)", color: c.status === "ACTIVE" ? "#1C1C1C" : c.status === "DRAFT" ? "#5a5457" : "#7a5c14", display: "inline-block", width: "fit-content" }}>{c.status}</span>
                      <span style={{ color: "#4a4446" }}>{c.sent ?? "-"}</span>
                      <button onClick={() => void toggleCampaign(c)} style={{ border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}>
                        {c.status === "ACTIVE" ? "Pause" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                    <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Promotions</h4>
                    {promotions.length === 0 && <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>No promotions yet.</p>}
                    {promotions.map(p => (
                      <p key={p.id} style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>{p.title}{p.active ? "" : " (inactive)"}</p>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input className="bb-input" placeholder="Promotion title" value={newPromo} onChange={e => setNewPromo(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(28,28,28,.1)", fontSize: 13 }} />
                      <button onClick={() => void createPromotion()} style={{ border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>+ Add</button>
                    </div>
                  </div>
                  <div style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
                    <h4 style={{ fontFamily: serif, fontSize: 18, fontWeight: 600 }}>Active offers</h4>
                    {offersList.length === 0 && <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>No offers yet.</p>}
                    {offersList.map(o => (
                      <p key={o.id} style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>{o.title}{o.active ? "" : " (inactive)"}</p>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input className="bb-input" placeholder="Offer title" value={newOffer} onChange={e => setNewOffer(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(28,28,28,.1)", fontSize: 13 }} />
                      <button onClick={() => void createOffer()} style={{ border: "none", background: "transparent", color: "#B06A85", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>+ Add</button>
                    </div>
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
