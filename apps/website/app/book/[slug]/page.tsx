"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, BookingInfo, rupees, SalonDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";
const steps = ["Services", "Specialist", "Date & time", "Payment", "Confirmed"] as const;

function nextDates(n: number) {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    out.push({ value, label });
  }
  return out;
}

function BookingContent() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();

  const [salon, setSalon] = useState<SalonDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);

  const [serviceIds, setServiceIds] = useState<string[]>(search.get("service") ? [search.get("service")!] : []);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [date, setDate] = useState(nextDates(1)[0].value);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "JAZZCASH" | "EASYPAISA">("CASH");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    api<{ salon: SalonDetail }>(`/api/salons/${slug}`)
      .then((res) => setSalon(res.salon))
      .catch(() => setLoadError("Could not load this salon. Make sure the API and database are running."));
  }, [slug]);

  const selected = useMemo(
    () => (salon ? salon.services.filter((s) => serviceIds.includes(s.id)) : []),
    [salon, serviceIds],
  );
  const subtotal = selected.reduce((s, x) => s + x.price, 0);
  const durationMin = selected.reduce((s, x) => s + x.durationMin, 0);

  useEffect(() => {
    if (!salon || serviceIds.length === 0) return;
    setSlotsLoading(true);
    setTime("");
    const sp = new URLSearchParams({ date, serviceId: serviceIds[0] });
    if (employeeId) sp.set("employeeId", employeeId);
    api<{ slots: string[] }>(`/api/salons/${slug}/slots?${sp.toString()}`)
      .then((res) => setSlots(res.slots))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [salon, slug, date, serviceIds, employeeId]);

  const applyCoupon = async () => {
    setCouponMsg("");
    setDiscount(0);
    if (!couponCode) return;
    try {
      const res = await api<{ discount: number }>("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: couponCode, subtotal, salonSlug: slug }),
      });
      setDiscount(res.discount);
      setCouponMsg(`Coupon applied — you save ${rupees(res.discount)}.`);
    } catch (e) {
      setCouponMsg(e instanceof Error ? e.message : "Invalid coupon");
    }
  };

  const confirm = async () => {
    if (!token) return router.push(`/login?next=/book/${slug}`);
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api<{ booking: BookingInfo }>("/api/bookings", {
        method: "POST",
        token,
        body: JSON.stringify({
          salonSlug: slug,
          serviceIds,
          employeeId: employeeId || undefined,
          date,
          time,
          paymentMethod,
          couponCode: discount > 0 ? couponCode : undefined,
        }),
      });
      setBooking(res.booking);
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const pill = (active: boolean) => ({
    padding: "10px 16px",
    borderRadius: 14,
    border: active ? "1.5px solid #B06A85" : "1px solid rgba(28,28,28,.1)",
    background: active ? "rgba(235,200,211,.3)" : "rgba(255,255,255,.8)",
    fontSize: 14,
    fontWeight: 600 as const,
    cursor: "pointer",
    color: "#1C1C1C",
  });

  if (loadError) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: serif, fontSize: 36, fontWeight: 500 }}>Booking unavailable</h1>
        <p style={{ marginTop: 14, color: "#5a5457" }}>{loadError}</p>
      </div>
    );
  }
  if (!salon) {
    return <p style={{ textAlign: "center", padding: 100, color: "#5a5457" }}>Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Book an appointment</span>
      <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>{salon.name}</h1>
      <p style={{ fontSize: 15, color: "#5a5457", marginTop: 6 }}>{salon.area.name}, {salon.area.city.name}</p>

      {/* STEPPER */}
      <div style={{ display: "flex", gap: 8, marginTop: 28, flexWrap: "wrap" }}>
        {steps.map((label, i) => (
          <span
            key={label}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "8px 14px",
              borderRadius: 14,
              background: i === step ? "#1C1C1C" : i < step ? "rgba(235,200,211,.4)" : "rgba(28,28,28,.05)",
              color: i === step ? "#FAF8F7" : i < step ? "#B06A85" : "#5a5457",
            }}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 30, borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)", padding: "clamp(24px,4vw,40px)" }}>
        {step === 0 && (
          <>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Choose your services</h2>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {salon.services.map((svc) => {
                const active = serviceIds.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() =>
                      setServiceIds((ids) => (active ? ids.filter((x) => x !== svc.id) : [...ids, svc.id]))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "16px 18px",
                      borderRadius: 16,
                      textAlign: "left",
                      border: active ? "1.5px solid #B06A85" : "1px solid rgba(28,28,28,.08)",
                      background: active ? "rgba(235,200,211,.22)" : "rgba(250,248,247,.6)",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <span style={{ fontSize: 15, fontWeight: 600, display: "block" }}>{svc.name}</span>
                      <span style={{ fontSize: 13, color: "#5a5457" }}>{svc.category.name} · {svc.durationMin} min</span>
                    </span>
                    <span style={{ fontFamily: serif, fontSize: 19, fontWeight: 600, whiteSpace: "nowrap" }}>{rupees(svc.price)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Choose a specialist</h2>
            <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Optional — leave unselected for first available.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <button style={pill(employeeId === "")} onClick={() => setEmployeeId("")}>Any specialist</button>
              {salon.employees.map((e) => (
                <button key={e.id} style={pill(employeeId === e.id)} onClick={() => setEmployeeId(e.id)}>
                  {e.name} · {e.title}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Pick a date &amp; time</h2>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              {nextDates(7).map((d) => (
                <button key={d.value} style={pill(date === d.value)} onClick={() => setDate(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              {slotsLoading && <p style={{ color: "#5a5457", fontSize: 14 }}>Checking availability…</p>}
              {!slotsLoading && slots.length === 0 && <p style={{ color: "#5a5457", fontSize: 14 }}>No free slots this day — try another date.</p>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {slots.map((s) => (
                  <button key={s} style={pill(time === s)} onClick={() => setTime(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Payment</h2>
            <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              {([["CASH", "Pay at salon"], ["CARD", "Card"], ["JAZZCASH", "JazzCash"], ["EASYPAISA", "EasyPaisa"]] as const).map(([m, label]) => (
                <button key={m} style={pill(paymentMethod === m)} onClick={() => setPaymentMethod(m)}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, maxWidth: 420 }}>
              <input
                className="bb-input"
                placeholder="Coupon code (e.g. BRIDAL30)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              />
              <button onClick={() => void applyCoupon()} className="bb-btn" style={{ padding: "0 20px", border: "none", borderRadius: 14, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Apply
              </button>
            </div>
            {couponMsg && <p style={{ fontSize: 13, marginTop: 10, color: discount > 0 ? "#B06A85" : "#a33" }}>{couponMsg}</p>}

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(28,28,28,.08)", fontSize: 15 }}>
              {selected.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#4a4446" }}>
                  <span>{s.name}</span>
                  <span>{rupees(s.price)}</span>
                </div>
              ))}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#B06A85" }}>
                  <span>Discount</span>
                  <span>-{rupees(discount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(28,28,28,.08)", fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontFamily: serif, fontSize: 22 }}>{rupees(Math.max(subtotal - discount, 0))}</span>
              </div>
              <p style={{ fontSize: 13, color: "#5a5457", marginTop: 8 }}>
                {date} at {time} · {durationMin} min{employeeId ? ` · ${salon.employees.find((e) => e.id === employeeId)?.name}` : ""}
              </p>
            </div>
            {!authLoading && !user && (
              <p style={{ marginTop: 16, fontSize: 14, color: "#a33" }}>
                You need an account to confirm — <Link href={`/login?next=/book/${slug}`} style={{ color: "#B06A85" }}>log in</Link> or{" "}
                <Link href={`/signup?next=/book/${slug}`} style={{ color: "#B06A85" }}>sign up</Link>.
              </p>
            )}
            {submitError && <p style={{ marginTop: 16, fontSize: 14, color: "#a33" }}>{submitError}</p>}
          </>
        )}

        {step === 4 && booking && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(235,200,211,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontFamily: serif, fontSize: 30, color: "#B06A85" }}>
              ✓
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 34, fontWeight: 600, marginTop: 20 }}>You&apos;re booked!</h2>
            <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>
              Booking code <strong style={{ color: "#1C1C1C" }}>{booking.code}</strong> · {new Date(booking.startAt).toLocaleString()} · {rupees(booking.total)}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 26, flexWrap: "wrap" }}>
              <Link href="/dashboard" className="bb-btn" style={{ borderRadius: 18, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, padding: "13px 24px", textDecoration: "none" }}>
                View my bookings
              </Link>
              <Link href="/explore" style={{ fontSize: 14, fontWeight: 600, color: "#B06A85", textDecoration: "none", padding: "13px 10px" }}>
                Keep exploring →
              </Link>
            </div>
          </div>
        )}

        {/* NAV BUTTONS */}
        {step < 4 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{ padding: "12px 22px", borderRadius: 16, border: "1px solid rgba(28,28,28,.12)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1 }}
            >
              ← Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && serviceIds.length === 0) || (step === 2 && !time)}
                className="bb-btn"
                style={{
                  padding: "12px 28px",
                  borderRadius: 16,
                  border: "none",
                  background: "#1C1C1C",
                  color: "#FAF8F7",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: (step === 0 && serviceIds.length === 0) || (step === 2 && !time) ? 0.4 : 1,
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => void confirm()}
                disabled={submitting || !user}
                className="bb-btn"
                style={{ padding: "12px 28px", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: submitting || !user ? 0.5 : 1 }}
              >
                {submitting ? "Confirming…" : `Confirm booking · ${rupees(Math.max(subtotal - discount, 0))}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <BookingContent />
      </Suspense>
      <Footer />
    </>
  );
}
