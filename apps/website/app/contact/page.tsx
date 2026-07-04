"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

const serif = "'Cormorant Garamond',serif";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setName(""); setEmail(""); setSubject(""); setMessage("");
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Contact</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Get in touch</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>We&apos;d love to hear from you.</p>
        </Reveal>

        <div className="bb-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <Reveal>
            <div style={{ borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 32 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Send us a message</h2>
              {sent ? (
                <div style={{ marginTop: 20, padding: 20, borderRadius: 16, background: "rgba(235,200,211,.2)", color: "#B06A85", fontWeight: 600 }}>
                  Thank you! We&apos;ll get back to you within 24 hours.
                </div>
              ) : (
                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
                  <input className="bb-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required minLength={2} />
                  <input className="bb-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" required />
                  <input className="bb-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" required minLength={3} />
                  <textarea className="bb-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message" required minLength={10} style={{ minHeight: 120, resize: "vertical" }} />
                  <button type="submit" className="bb-btn" style={{ padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 6 }}>Send message</button>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal>
            <div style={{ borderRadius: 24, background: "rgba(235,200,211,.12)", padding: 32 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Contact information</h2>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 18, fontSize: 15, color: "#4a4446", lineHeight: 1.6 }}>
                <div><strong style={{ color: "#1C1C1C" }}>General inquiries</strong><br />hello@beautybook.pk</div>
                <div><strong style={{ color: "#1C1C1C" }}>Partner support</strong><br />partners@beautybook.pk</div>
                <div><strong style={{ color: "#1C1C1C" }}>Press</strong><br />press@beautybook.pk</div>
                <div><strong style={{ color: "#1C1C1C" }}>Phone</strong><br />0800-BEAUTY (0800-232889)</div>
                <div><strong style={{ color: "#1C1C1C" }}>Offices</strong><br />Karachi · Lahore · Islamabad</div>
                <div style={{ paddingTop: 12, borderTop: "1px solid rgba(28,28,28,.1)", fontSize: 14, color: "#5a5457" }}>
                  We respond to all inquiries within 24 hours on business days.
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
      <Footer />
    </>
  );
}
