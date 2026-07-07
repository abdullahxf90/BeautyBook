"use client";

import Link from "next/link";
import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

const serif = "'Space Grotesk',sans-serif";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,52px)" }}>Forgot password</h1>
          <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>{sent ? "Check your email for reset instructions." : "Enter your email and we&apos;ll send you a reset link."}</p>
        </div>
        {!sent ? (
          <form onSubmit={submit} style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
            <input className="bb-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
            {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
            <button type="submit" disabled={busy} className="bb-btn" style={{ padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Sending..." : "Send reset link"}
            </button>
            <p style={{ fontSize: 14, color: "#5a5457", textAlign: "center", marginTop: 6 }}>
              Remember your password? <Link href="/login" style={{ color: "#B06A85", fontWeight: 600 }}>Log in</Link>
            </p>
          </form>
        ) : (
          <div style={{ marginTop: 34, padding: 30, borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(235,200,211,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontFamily: serif, fontSize: 26, color: "#B06A85" }}>✓</div>
            <p style={{ fontSize: 15, color: "#5a5457", marginTop: 16, lineHeight: 1.5 }}>If an account exists with <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.</p>
            <Link href="/login" className="bb-btn" style={{ display: "inline-block", marginTop: 20, borderRadius: 16, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, padding: "12px 24px", textDecoration: "none" }}>Back to login</Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
