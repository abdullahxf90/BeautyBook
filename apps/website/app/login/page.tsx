"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        return;
      }
      router.push(params.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setBusy(true);
    setError("");
    try {
      await verifyTwoFactor(challengeToken, code);
      router.push(params.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  if (challengeToken) {
    return (
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,52px)" }}>Two-factor check</h1>
          <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>
            Enter the 6-digit code we sent to your account notifications.
          </p>
        </div>
        <form onSubmit={submitCode} style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
          <input
            className="bb-input"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            aria-label="Two-factor code"
            style={{ textAlign: "center", letterSpacing: ".4em", fontSize: 18 }}
          />
          {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="bb-btn"
            style={{ marginTop: 6, padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy || code.length !== 6 ? 0.6 : 1 }}
          >
            {busy ? "Verifying…" : "Verify & log in"}
          </button>
          <button
            type="button"
            onClick={() => { setChallengeToken(null); setCode(""); setError(""); }}
            style={{ background: "none", border: "none", fontSize: 14, color: "#B06A85", fontWeight: 600, cursor: "pointer" }}
          >
            Back to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "clamp(48px,9vh,110px) 24px 90px" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,52px)" }}>Welcome back</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10 }}>Log in to book, review, and glow.</p>
      </div>
      <form onSubmit={submit} style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14, background: "#fff", padding: 30, borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
        <input className="bb-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        <input className="bb-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-label="Password" />
        {error && <p style={{ fontSize: 13, color: "#a33" }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bb-btn"
          style={{ marginTop: 6, padding: "14px 0", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
        <SocialLoginButtons
          onSuccess={() => router.push(params.get("next") || "/dashboard")}
          onError={(m) => setError(m)}
        />
        <p style={{ fontSize: 14, color: "#5a5457", textAlign: "center", marginTop: 6 }}>
          New to BeautyBook?{" "}
          <Link href={`/signup${params.get("next") ? `?next=${params.get("next")}` : ""}`} style={{ color: "#B06A85", fontWeight: 600 }}>
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Nav />
      <Suspense>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  );
}
