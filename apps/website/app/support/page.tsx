"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Cormorant Garamond',serif";

const faqs = [
  { q: "How do I book an appointment?", a: "Browse salons on the Explore page, select your desired services, pick a specialist and time slot, then confirm your booking. You'll receive an instant confirmation." },
  { q: "Can I cancel or reschedule a booking?", a: "Yes, you can cancel or reschedule upcoming bookings from your dashboard. Cancellation policies vary by salon and are displayed during booking." },
  { q: "How do reviews work?", a: "Only customers who have completed an appointment can leave a review. This ensures all reviews are from verified experiences." },
  { q: "What payment methods are accepted?", a: "We accept cash at the salon, credit/debit cards, JazzCash, and EasyPaisa. Card payments are processed securely." },
  { q: "How do I become a partner salon?", a: "Visit our Become a Partner page and create an account. Our team will guide you through the verification process." },
  { q: "What are loyalty points?", a: "You earn loyalty points on completed bookings. Points can be redeemed for discounts on future appointments." },
  { q: "How do I use a coupon code?", a: "Enter your coupon code at the payment step of the booking process. The discount will be applied automatically." },
  { q: "Is my data secure?", a: "Yes, we use industry-standard encryption and security measures to protect your personal and payment information." },
];

export default function SupportPage() {
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Support</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>How can we help?</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Find answers to common questions below, or reach out to our team.</p>
          <input className="bb-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..." style={{ maxWidth: 500, marginTop: 24 }} />
        </Reveal>

        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((faq, i) => (
            <div key={i} style={{ borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)", overflow: "hidden" }}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ width: "100%", padding: "18px 22px", border: "none", background: "transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 15, fontWeight: 600, textAlign: "left", color: "#1C1C1C" }}>
                {faq.q}
                <span style={{ fontSize: 18, color: "#B06A85", transition: "transform .3s ease", transform: openIdx === i ? "rotate(180deg)" : "none" }}>▾</span>
              </button>
              {openIdx === i && (
                <div style={{ padding: "0 22px 18px", fontSize: 15, color: "#5a5457", lineHeight: 1.6 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        <Reveal style={{ marginTop: 56, padding: 32, borderRadius: 22, background: "rgba(235,200,211,.15)", textAlign: "center" }}>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Still need help?</h2>
          <p style={{ fontSize: 15, color: "#5a5457", marginTop: 8 }}>Email us at hello@beautybook.pk or call 0800-BEAUTY</p>
          <p style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>We respond within 24 hours</p>
        </Reveal>
      </div>
      <Footer />
    </>
  );
}
