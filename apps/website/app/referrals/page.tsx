"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

interface Reward {
  id: string;
  points: number;
  status: string;
  createdAt: string;
  referrer: { id: string; name: string };
  claimant: { id: string; name: string };
}

interface Stats {
  totalReferrals: number;
  pointsEarned: number;
  pointsAwarded: number;
}

export default function ReferralsPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimCode, setClaimCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [codeRes, statsRes, rewardsRes] = await Promise.all([
      api<{ referralCode: string }>("/api/referrals/code", { token }).catch(() => null),
      api<Stats>("/api/referrals/stats", { token }).catch(() => null),
      api<{ rewards: Reward[] }>("/api/referrals/rewards", { token }).catch(() => null),
    ]);
    if (codeRes) setCode(codeRes.referralCode);
    if (statsRes) setStats(statsRes);
    if (rewardsRes) setRewards(rewardsRes.rewards);
  }, [token]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/referrals");
  }, [loading, user, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !claimCode.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/referrals/claim", { method: "POST", token, body: JSON.stringify({ code: claimCode.trim().toUpperCase() }) });
      setMessage({ ok: true, text: "Referral claimed — bonus points added to both accounts." });
      setClaimCode("");
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not claim referral" });
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <>
        <Nav />
        <div style={{ minHeight: "50vh", display: "grid", placeItems: "center", color: "#5a5457" }}>Loading…</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>Referrals</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, maxWidth: "52ch" }}>
          Share BeautyBook with friends. When they sign up with your code and complete a booking, you both earn loyalty points.
        </p>

        {/* Your code */}
        <div style={{ marginTop: 34, background: "#fff", borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)", padding: 30 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85" }}>Your referral code</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, letterSpacing: ".14em" }}>{code ?? "········"}</span>
            <button
              onClick={copy}
              disabled={!code}
              className="bb-btn"
              style={{ padding: "11px 22px", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: code ? 1 : 0.5 }}
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginTop: 20 }}>
          {[
            ["Friends referred", stats ? String(stats.totalReferrals) : "—"],
            ["Points earned", stats ? String(stats.pointsEarned) : "—"],
            ["Points awarded to friends", stats ? String(stats.pointsAwarded) : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(28,28,28,.07)", padding: "18px 20px" }}>
              <div style={{ fontSize: 13, color: "#5a5457" }}>{label}</div>
              <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 600, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Claim a code */}
        <div style={{ marginTop: 20, background: "#fff", borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", padding: 30 }}>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Have a friend&apos;s code?</h2>
          <form onSubmit={claim} style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <input
              className="bb-input"
              placeholder="Enter referral code"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              aria-label="Referral code"
              style={{ flex: "1 1 220px", textTransform: "uppercase" }}
            />
            <button
              type="submit"
              disabled={busy || !claimCode.trim()}
              className="bb-btn"
              style={{ padding: "12px 26px", borderRadius: 16, border: "none", background: "#B06A85", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy || !claimCode.trim() ? 0.6 : 1 }}
            >
              {busy ? "Claiming…" : "Claim"}
            </button>
          </form>
          {message && (
            <p style={{ fontSize: 14, marginTop: 10, color: message.ok ? "#2e7d52" : "#a33" }}>{message.text}</p>
          )}
        </div>

        {/* History */}
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 14 }}>Referral history</h2>
          {rewards.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 18, border: "1px dashed rgba(28,28,28,.15)", padding: "28px 24px", textAlign: "center", color: "#5a5457", fontSize: 15 }}>
              No referral activity yet — share your code to start earning.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rewards.map((r) => {
                const isReferrer = r.referrer.id === user.id;
                return (
                  <div key={r.id} style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(28,28,28,.07)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {isReferrer ? `You referred ${r.claimant.name}` : `Referred by ${r.referrer.name}`}
                      </div>
                      <div style={{ fontSize: 13, color: "#5a5457", marginTop: 2 }}>
                        {new Date(r.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })} · {r.status}
                      </div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#B06A85" }}>+{r.points} pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
