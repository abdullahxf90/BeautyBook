"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

const serif = "'Cormorant Garamond',serif";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(235,200,211,.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontFamily: serif, fontSize: 26, color: "#B06A85" }}>✓</div>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: 32, marginTop: 20 }}>Password reset!</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Your password has been updated successfully.</p>
        <Link href="/login" className="bb-btn" style={{ display: "inline-block", marginTop: 24, borderRadius: 16, background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, padding: "12px 24px", textDecoration: "none" }}>Log in</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,52px)" }}>Set new password</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Enter your new password below.</p>
      </div>
      <form onSubmit={submit} style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)" }}>
        <input className="bb-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min 8 characters)" required minLength={8} />
        <input className="bb-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" required minLength={8} />
        {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
        <button type="submit" disabled={busy || !token} className="bb-btn" style={{ padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy || !token ? 0.6 : 1 }}>
          {busy ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Nav />
      <Suspense><ResetForm /></Suspense>
      <Footer />
    </>
  );
}
