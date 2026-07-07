"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api, rupees } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

interface WalletTxn { id: string; type: string; amount: number; balance: number; reason: string; createdAt: string }
interface LoyaltyTxn { id: string; points: number; reason: string; createdAt: string }

export default function WalletPage() {
  const { token, user, loading } = useAuth();
  const router = useRouter();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loyaltyTxns, setLoyaltyTxns] = useState<LoyaltyTxn[]>([]);
  const [tab, setTab] = useState<"wallet" | "loyalty">("wallet");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/wallet");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    const [wRes, lRes] = await Promise.all([
      api<{ balance: number; walletBalance: number; transactions: WalletTxn[] }>("/api/wallet", { token }).catch(() => ({ balance: 0, walletBalance: 0, transactions: [] })),
      api<{ points: number; transactions: LoyaltyTxn[] }>("/api/wallet/loyalty", { token }).catch(() => ({ points: 0, transactions: [] })),
    ]);
    setWalletBalance(wRes.walletBalance);
    setTransactions(wRes.transactions);
    setLoyaltyTxns(lRes.transactions);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  if (loading || !user) return null;

  const tabStyle = (t: string) => ({
    padding: "11px 20px", borderRadius: 16, border: "none", fontSize: 14, fontWeight: 600 as const,
    cursor: "pointer", background: tab === t ? "#1C1C1C" : "rgba(255,255,255,.7)",
    color: tab === t ? "#FAF8F7" : "#4a4446",
  });

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Wallet</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Your balance</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 28 }}>
          <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
            <p style={{ fontSize: 14, color: "#5a5457" }}>Wallet balance</p>
            <p style={{ fontFamily: serif, fontSize: 42, fontWeight: 600, marginTop: 8 }}>{rupees(walletBalance)}</p>
          </div>
          <div style={{ borderRadius: 22, background: "rgba(235,200,211,.15)", border: "1px solid rgba(235,200,211,.3)", padding: 28 }}>
            <p style={{ fontSize: 14, color: "#5a5457" }}>Loyalty points</p>
            <p style={{ fontFamily: serif, fontSize: 42, fontWeight: 600, marginTop: 8, color: "#B06A85" }}>{user.loyaltyPoints}</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <button style={tabStyle("wallet")} onClick={() => setTab("wallet")}>Transactions</button>
          <button style={tabStyle("loyalty")} onClick={() => setTab("loyalty")}>Loyalty history</button>
        </div>

        {tab === "wallet" && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {transactions.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>No wallet transactions yet.</p>}
            {transactions.map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{tx.reason}</p>
                  <p style={{ fontSize: 12, color: "#5a5457", marginTop: 2 }}>{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: tx.type === "CREDIT" ? "#B06A85" : "#a33" }}>{tx.type === "CREDIT" ? "+" : "-"}{rupees(tx.amount)}</p>
                  <p style={{ fontSize: 12, color: "#5a5457" }}>Balance: {rupees(tx.balance)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "loyalty" && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {loyaltyTxns.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>No loyalty transactions yet. Book appointments to earn points!</p>}
            {loyaltyTxns.map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: 16, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{tx.reason}</p>
                  <p style={{ fontSize: 12, color: "#5a5457", marginTop: 2 }}>{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#B06A85" }}>+{tx.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
