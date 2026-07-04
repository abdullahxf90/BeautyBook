"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const bookingId = params.get("bookingId");
  const [status, setStatus] = useState<"loading" | "ready" | "processing" | "done" | "error">("loading");
  const [info, setInfo] = useState<{ code: string; total: number; salon: string; method: string } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!bookingId) { setStatus("error"); setMsg("No booking ID provided."); return; }
    // In a real app you'd fetch payment details here
    setStatus("ready");
    setInfo({ code: "BB-XXXX", total: 0, salon: "Salon", method: "CASH" });
  }, [bookingId]);

  const processPayment = useCallback(async () => {
    setStatus("processing");
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 1500));
    setStatus("done");
  }, []);

  if (status === "loading") return <div style={{ textAlign: "center", padding: 100, color: "#5a5457" }}>Loading payment...</div>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(40px,6vh,80px) 24px 90px" }}>
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Checkout</span>
      <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Complete payment</h1>

      <div style={{ marginTop: 28, borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 32, boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
        {status === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(235,200,211,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontFamily: serif, fontSize: 28, color: "#B06A85" }}>✓</div>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, marginTop: 20 }}>Payment confirmed!</h2>
            <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Your booking is confirmed. Check your dashboard for details.</p>
            <Link href="/dashboard" className="bb-btn" style={{ display: "inline-block", marginTop: 20, borderRadius: 18, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, padding: "13px 24px", textDecoration: "none" }}>View bookings</Link>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {["Booking", "Amount", "Payment method"].map((label, i) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: 14, background: "rgba(250,248,247,.7)" }}>
                  <span style={{ fontSize: 14, color: "#5a5457" }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {i === 0 ? (info?.code || "—") : i === 1 ? (info ? rupees(info.total) : "—") : (info?.method || "—")}
                  </span>
                </div>
              ))}
            </div>
            {status === "error" && <p style={{ marginTop: 16, fontSize: 14, color: "#a33" }}>{msg}</p>}
            <button onClick={() => void processPayment()} disabled={status === "processing"} className="bb-btn" style={{ marginTop: 24, padding: "14px 0", width: "100%", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: status === "processing" ? 0.6 : 1 }}>
              {status === "processing" ? "Processing..." : "Pay now"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Nav />
      <Suspense><CheckoutContent /></Suspense>
      <Footer />
    </>
  );
}
