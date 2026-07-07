"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

interface TierDef {
  name: string;
  minPoints: number;
  color: string;
  benefits: string[];
}

interface MyTier {
  tier: string;
  tierIndex: number;
  points: number;
  nextTier: { name: string; minPoints: number } | null;
  progress: number;
  pointsForNext: number;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [tiers, setTiers] = useState<TierDef[]>([]);
  const [myTier, setMyTier] = useState<MyTier | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [tRes, mRes] = await Promise.all([
      api<{ tiers: TierDef[] }>("/api/loyalty/tiers").catch(() => null),
      token ? api<MyTier>("/api/loyalty/my-tier", { token }).catch(() => null) : Promise.resolve(null),
    ]);
    if (tRes) setTiers(tRes.tiers);
    if (mRes) setMyTier(mRes);
  }, [token]);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/loyalty");
  }, [loading, user, router]);

  useEffect(() => { void load(); }, [load]);

  const recalculate = async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ currentTier: string; updated: boolean }>("/api/loyalty/calculate", { method: "POST", token });
      if (res.updated) await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to recalculate");
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

  const currentTierDef = tiers[myTier?.tierIndex ?? 0];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Loyalty</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05, marginTop: 10 }}>Your loyalty tiers</h1>
        <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, maxWidth: "52ch" }}>
          Earn points with every booking and unlock exclusive perks as you climb through the tiers.
        </p>

        {/* Current tier hero */}
        <div style={{ marginTop: 34, background: "#fff", borderRadius: 24, border: "1px solid rgba(28,28,28,.06)", boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)", padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: currentTierDef?.color ?? "#cd7f32", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              {myTier ? myTier.tier[0] : "?"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#5a5457" }}>Current tier</div>
              <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, lineHeight: 1.1, marginTop: 4 }}>{myTier?.tier ?? "—"}</div>
              <div style={{ fontSize: 15, color: "#5a5457", marginTop: 4 }}>{myTier?.points ?? 0} points earned</div>
            </div>
            <button
              onClick={recalculate}
              disabled={busy}
              className="bb-btn"
              style={{ padding: "11px 22px", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
            >
              {busy ? "Recalculating…" : "Recalculate tier"}
            </button>
          </div>

          {/* Progress bar */}
          {myTier && myTier.nextTier && (
            <div style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#5a5457", marginBottom: 8 }}>
                <span>{myTier.tier}</span>
                <span>{myTier.pointsForNext} pts to {myTier.nextTier.name}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(28,28,28,.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#B06A85,#cd7f32)", transition: "width .6s ease", width: `${myTier.progress}%` }} />
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "#5a5457", marginTop: 4 }}>{myTier.progress}%</div>
            </div>
          )}
          {myTier && !myTier.nextTier && (
            <div style={{ marginTop: 20, textAlign: "center", padding: "16px 0", borderRadius: 16, background: "rgba(185,242,255,.12)", border: "1px solid rgba(185,242,255,.3)" }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#1C1C1C", marginLeft: 8 }}>You&apos;ve reached the highest tier!</span>
            </div>
          )}
        </div>

        {/* All tiers */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginBottom: 18 }}>Tiers &amp; benefits</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {tiers.map((tier) => {
              const isCurrent = myTier?.tier === tier.name;
              const isLocked = myTier ? tier.minPoints > myTier.points : false;
              return (
                <div
                  key={tier.name}
                  style={{
                    borderRadius: 22,
                    background: isCurrent ? "#fff" : "rgba(255,255,255,.6)",
                    border: isCurrent ? `2px solid ${tier.color}` : "1px solid rgba(28,28,28,.06)",
                    boxShadow: isCurrent ? "0 8px 32px -12px rgba(28,28,28,.2)" : "none",
                    padding: 24,
                    opacity: isLocked && !isCurrent ? 0.55 : 1,
                    position: "relative",
                  }}
                >
                  {isCurrent && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#B06A85" }}>Current</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: tier.color, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {tier.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{tier.name}</div>
                      <div style={{ fontSize: 13, color: "#5a5457" }}>{tier.minPoints === 0 ? "Start here" : `${tier.minPoints.toLocaleString()} pts`}</div>
                    </div>
                  </div>
                  <ul style={{ marginTop: 16, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {tier.benefits.map((b) => (
                      <li key={b} style={{ fontSize: 14, color: "#4a4446", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: tier.color }}>◆</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {err && <p style={{ fontSize: 14, marginTop: 16, color: "#a33" }}>{err}</p>}
      </div>
      <Footer />
    </>
  );
}
