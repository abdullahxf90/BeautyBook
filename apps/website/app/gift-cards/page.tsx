"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

interface GiftCardInfo { id: string; code: string; amount: number; balance: number; message: string | null; recipientEmail: string | null; recipientName: string | null; recipient: { name: string; email: string } | null; createdAt: string; redeemedAt: string | null }

export default function GiftCardsPage() {
  const { token } = useAuth();
  const [cards, setCards] = useState<GiftCardInfo[]>([]);
  const [received, setReceived] = useState<GiftCardInfo[]>([]);
  const [amount, setAmount] = useState("1000");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [purchased, receivedRes] = await Promise.all([
      api<{ giftCards: GiftCardInfo[] }>("/api/gift-cards", { token }).catch(() => ({ giftCards: [] })),
      api<{ giftCards: GiftCardInfo[] }>("/api/gift-cards/received", { token }).catch(() => ({ giftCards: [] })),
    ]);
    setCards(purchased.giftCards);
    setReceived(receivedRes.giftCards);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const purchase = async () => {
    if (!token) return;
    setBusy(true);
    setMsg("");
    try {
      await api("/api/gift-cards", { method: "POST", token, body: JSON.stringify({ amount: parseInt(amount), recipientEmail: recipientEmail || undefined, recipientName: recipientName || undefined, message: message || undefined }) });
      setMsg(`Gift card purchased! Share the code with your recipient.`);
      setAmount("1000");
      setRecipientEmail("");
      setRecipientName("");
      setMessage("");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const amounts = [500, 1000, 2000, 5000, 10000];

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(48px,8vh,100px) clamp(24px,5vw,40px) 90px" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Gift Cards</span>
          <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(40px,6vw,72px)", marginTop: 14, lineHeight: 1.05 }}>Give the gift of glow</h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 18 }}>Beautiful gift cards redeemable at any BeautyBook partner salon.</p>
        </Reveal>

        <div className="bb-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <Reveal>
            <div style={{ borderRadius: 24, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 32, boxShadow: "0 24px 60px -36px rgba(28,28,28,.35)" }}>
              <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Purchase a gift card</h2>
              <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                {amounts.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))} style={{ padding: "12px 22px", borderRadius: 14, border: amount === String(a) ? "1.5px solid #B06A85" : "1px solid rgba(28,28,28,.1)", background: amount === String(a) ? "rgba(235,200,211,.3)" : "rgba(255,255,255,.8)", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#1C1C1C" }}>{rupees(a)}</button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                <input className="bb-input" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient email (optional)" />
                <input className="bb-input" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient name (optional)" />
                <textarea className="bb-input" value={message} onChange={e => setMessage(e.target.value)} placeholder="Add a personal message..." style={{ minHeight: 80, resize: "vertical" }} />
              </div>
              <button onClick={() => void purchase()} disabled={busy} className="bb-btn" style={{ marginTop: 20, padding: "14px 0", width: "100%", borderRadius: 16, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                {busy ? "Processing..." : `Purchase ${rupees(parseInt(amount || "0"))} gift card`}
              </button>
              {msg && <p style={{ marginTop: 12, fontSize: 14, color: msg.includes("failed") ? "#a33" : "#B06A85" }}>{msg}</p>}
            </div>
          </Reveal>

          <Reveal>
            <div style={{ borderRadius: 24, background: "rgba(235,200,211,.15)", border: "1px solid rgba(235,200,211,.3)", padding: 32 }}>
              <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>How it works</h2>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16, fontSize: 15, color: "#4a4446", lineHeight: 1.6 }}>
                <p>1. Choose an amount and optionally personalise the card.</p>
                <p>2. You&apos;ll receive a unique gift card code instantly.</p>
                <p>3. Share the code with your loved one — they redeem it at checkout.</p>
                <p>4. Valid at any BeautyBook partner salon across Pakistan.</p>
              </div>
              <div style={{ marginTop: 24, padding: 20, borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>💡 Pro tip</p>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Gift cards make perfect wedding, birthday, or thank-you gifts for the beauty lover in your life.</p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* My gift cards */}
        {cards.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>My gift cards</h2>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {cards.map(card => (
                <div key={card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85", background: "rgba(235,200,211,.35)", padding: "4px 10px", borderRadius: 10 }}>{card.code}</span>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>{rupees(card.amount)} · Balance: {rupees(card.balance)}{card.recipientName ? ` · For ${card.recipientName}` : ""}</p>
                  </div>
                  <span style={{ fontSize: 13, color: "#5a5457" }}>{new Date(card.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Received gift cards */}
        {received.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600 }}>Received</h2>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {received.map(card => (
                <div key={card.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderRadius: 18, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#B06A85", background: "rgba(235,200,211,.35)", padding: "4px 10px", borderRadius: 10 }}>{card.code}</span>
                    <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>{rupees(card.balance)} remaining · {card.message ? `"${card.message}"` : ""}</p>
                  </div>
                  <span style={{ fontSize: 13, color: card.balance > 0 ? "#B06A85" : "#5a5457", fontWeight: 600 }}>{card.balance > 0 ? "Active" : "Redeemed"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!token && (
          <Reveal style={{ marginTop: 48, textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#5a5457" }}>Sign in to purchase and manage gift cards.</p>
            <Link href="/login" className="bb-btn" style={{ display: "inline-block", marginTop: 16, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}>Log in</Link>
          </Reveal>
        )}
      </div>
      <Footer />
    </>
  );
}
