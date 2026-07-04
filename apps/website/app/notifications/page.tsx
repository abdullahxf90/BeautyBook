"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Cormorant Garamond',serif";

interface NotificationInfo { id: string; title: string; body: string; read: boolean; createdAt: string }

export default function NotificationsPage() {
  const { token, user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/notifications");
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await api<{ notifications: NotificationInfo[] }>("/api/notifications", { token }).catch(() => ({ notifications: [] }));
    setNotifications(res.notifications);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    if (!token) return;
    await api("/api/notifications/read", { method: "POST", token }).catch(() => {});
    await load();
  };

  if (loading || !user) return null;

  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Notifications</span>
            <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>
              Your updates{unread > 0 ? ` (${unread})` : ""}
            </h1>
          </div>
          {unread > 0 && (
            <button onClick={() => void markAllRead()} className="bb-btn" style={{ padding: "11px 20px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ marginTop: 48, textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 16, color: "#5a5457" }}>No notifications yet. You&apos;ll see booking updates, offers, and reminders here.</p>
            <Link href="/explore" className="bb-btn" style={{ display: "inline-block", marginTop: 20, borderRadius: 20, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}>Explore salons</Link>
          </div>
        ) : (
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map((n) => (
              <div key={n.id} style={{ padding: "18px 22px", borderRadius: 18, background: n.read ? "rgba(255,255,255,.6)" : "#fff", border: n.read ? "1px solid rgba(28,28,28,.05)" : "1px solid rgba(176,106,133,.2)", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: n.read ? "transparent" : "#B06A85", marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: 14, color: "#5a5457", marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 12, color: "#5a5457", marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
