"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isPartner = params.get("role") === "owner";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(name, email, password, phone || undefined, isPartner ? "OWNER" : undefined);
      router.push(params.get("next") || (isPartner ? "/salon-dashboard" : "/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,52px)" }}>{isPartner ? "Create your partner account" : "Create your account"}</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>{isPartner ? "List your salon and start taking bookings." : "Join Pakistan’s beauty marketplace."}</p>
      </div>
      <form onSubmit={submit} style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
        <input className="bb-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} aria-label="Full name" />
        <input className="bb-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        <input className="bb-input" type="tel" placeholder="Phone (optional, e.g. 03001234567)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
        <input className="bb-input" type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} aria-label="Password" />
        {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bb-btn"
          style={{ marginTop: 6, padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Creating account…" : "Sign up"}
        </button>
        <SocialLoginButtons
          onSuccess={() => router.push(params.get("next") || "/dashboard")}
          onError={(m) => setError(m)}
        />
        <p style={{ fontSize: 14, color: "#5a5457", textAlign: "center", marginTop: 6 }}>
          Already a member?{" "}
          <Link href={`/login${params.get("next") ? `?next=${params.get("next")}` : ""}`} style={{ color: "#B06A85", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function SignupPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <SignupForm />
      </Suspense>
      <Footer />
    </>
  );
}
