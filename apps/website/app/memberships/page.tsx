"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

interface MembershipPlan { id: string; name: string; slug: string; description: string; price: number; durationDays: number; perks: string }
interface UserMembership { id: string; membershipId: string; status: string; startAt: string; expiresAt: string; membership: MembershipPlan }

export default function MembershipsPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [myMemberships, setMyMemberships] = useState<UserMembership[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [plansRes, myRes] = await Promise.all([
      api<{ memberships: MembershipPlan[] }>("/api/memberships/plans"),
      token ? api<{ memberships: UserMembership[] }>("/api/memberships/mine", { token }).catch(() => ({ memberships: [] })) : Promise.resolve({ memberships: [] }),
    ]);
    setPlans(plansRes.memberships);
    setMyMemberships(myRes.memberships);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const purchase = async (planId: string) => {
    if (!token) return;
    setBusy(planId);
    setMsg("");
    try {
      await api("/api/memberships/purchase", { method: "POST", token, body: JSON.stringify({ membershipId: planId }) });
      setMsg("Welcome to the membership! Your perks are now active.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (id: string) => {
    if (!token) return;
    try {
      await api(`/api/memberships/${id}/cancel`, { method: "POST", token });
      setMsg("Membership cancelled.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Memberships</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>The Glow Club</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Unlock exclusive perks, discounts, and VIP treatment.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {plans.map((plan) => {
            const active = myMemberships.find(m => m.membershipId === plan.id && m.status === "ACTIVE");
            let perks: string[] = [];
            try { perks = JSON.parse(plan.perks); } catch { perks = []; }
            const isFree = plan.price === 0;

            return (
              <Reveal key={plan.id}>
                <div className="bb-lift" style={{ borderRadius: 24, background: "#fff", border: active ? "1.5px solid #B06A85" : "1px solid rgba(28,28,28,.06)", padding: 32, height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                  {active && <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#FAF8F7", background: "#B06A85", padding: "6px 12px", borderRadius: 14 }}>Active</div>}
                  <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>{plan.name}</h2>
                  <p style={{ fontSize: 15, color: "#5a5457", marginTop: 10, lineHeight: 1.5, flex: 1 }}>{plan.description}</p>
                  <div style={{ marginTop: 20, fontFamily: serif, fontSize: 42, fontWeight: 600 }}>
                    {isFree ? <span>Free</span> : <>{rupees(plan.price)}<span style={{ fontSize: 16, color: "#5a5457", fontWeight: 400 }}> /year</span></>}
                  </div>
                  <ul style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
                    {perks.map((perk: string, i: number) => (
                      <li key={i} style={{ fontSize: 14, color: "#4a4446", display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "#B06A85" }}>✓</span> {perk}</li>
                    ))}
                  </ul>
                  {active ? (
                    <button onClick={() => void cancel(active.id)} className="bb-btn-ghost" style={{ marginTop: 24, padding: "14px 0", width: "100%", borderRadius: 16, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel membership</button>
                  ) : (
                    <button onClick={() => void purchase(plan.id)} disabled={busy === plan.id} className="bb-btn" style={{ marginTop: 24, padding: "14px 0", width: "100%", borderRadius: 16, border: "none", background: isFree ? "rgba(235,200,211,.4)" : "#1C1C1C", color: isFree ? "#B06A85" : "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy === plan.id ? 0.6 : 1 }}>
                      {busy === plan.id ? "Processing..." : active ? "Renew" : isFree ? "Join free" : "Join now"}
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {msg && <p style={{ marginTop: 24, fontSize: 14, color: "#B06A85", fontWeight: 600, textAlign: "center" }}>{msg}</p>}

        {!token && (
          <Reveal style={{ marginTop: 48, textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#5a5457" }}>Sign up free to get the Glow Starter membership.</p>
            <Link href="/signup" className="bb-btn" style={{ display: "inline-block", marginTop: 16, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}>Create free account</Link>
          </Reveal>
        )}

        {myMemberships.length > 0 && (
          <Reveal style={{ marginTop: 56 }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>My memberships</h2>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {myMemberships.map(m => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{m.membership.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", marginLeft: 12, padding: "4px 10px", borderRadius: 10, background: m.status === "ACTIVE" ? "rgba(235,200,211,.35)" : "rgba(28,28,28,.07)", color: m.status === "ACTIVE" ? "#B06A85" : "#5a5457" }}>{m.status}</span>
                    <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>Expires: {new Date(m.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </div>
      <Footer />
    </>
  );
}
