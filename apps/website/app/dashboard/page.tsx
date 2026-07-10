"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { api, BookingInfo, rupees, SalonSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLive } from "@/lib/useLive";

const serif = "'Space Grotesk',sans-serif";
type Tab = "bookings" | "favorites" | "notifications" | "profile";

interface NotificationInfo {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; fg: string }> = {
  CONFIRMED: { bg: "rgba(235,200,211,.4)", fg: "#B06A85" },
  PENDING: { bg: "rgba(212,175,55,.2)", fg: "#7a5c14" },
  COMPLETED: { bg: "rgba(28,28,28,.08)", fg: "#1C1C1C" },
  CANCELLED: { bg: "rgba(163,51,51,.12)", fg: "#a33" },
  NO_SHOW: { bg: "rgba(163,51,51,.12)", fg: "#a33" },
};

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; salon: SalonSummary }[]>([]);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/dashboard");
  }, [loading, user, router]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [b, f, n] = await Promise.allSettled([
      api<{ bookings: BookingInfo[] }>("/api/bookings/mine", { token }),
      api<{ favorites: { id: string; salon: SalonSummary }[] }>("/api/favorites", { token }),
      api<{ notifications: NotificationInfo[] }>("/api/notifications", { token }),
    ]);
    if (b.status === "fulfilled") setBookings(b.value.bookings);
    if (f.status === "fulfilled") setFavorites(f.value.favorites);
    if (n.status === "fulfilled") setNotifications(n.value.notifications);
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useLive(refresh, 15000);

  const cancel = async (id: string) => {
    if (!token) return;
    try {
      await api(`/api/bookings/${id}/cancel`, { method: "POST", token });
      setMsg("Booking cancelled.");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not cancel");
    }
  };

  const submitReview = async (bookingId: string) => {
    if (!token) return;
    try {
      await api("/api/reviews", {
        method: "POST",
        token,
        body: JSON.stringify({ bookingId, rating: reviewRating, text: reviewText }),
      });
      setMsg("Thank you — your verified review is live.");
      setReviewFor(null);
      setReviewText("");
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not submit review");
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    await api("/api/notifications/read", { method: "POST", token }).catch(() => {});
    await refresh();
  };

  if (loading || !user) return null;

  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING");
  const past = bookings.filter((b) => b.status !== "CONFIRMED" && b.status !== "PENDING");

  const bookingCard = (b: BookingInfo) => {
    const sc = statusColors[b.status] || statusColors.COMPLETED;
    return (
      <div key={b.id} style={{ borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <Link href={`/salon/${b.salon.slug}`} style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: "#1C1C1C", textDecoration: "none" }}>
              {b.salon.name}
            </Link>
            <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>
              {new Date(b.startAt).toLocaleString()} · {b.durationMin} min · Code {b.code}
              {b.employee ? ` · with ${b.employee.name}` : ""}
            </p>
            <p style={{ fontSize: 13, color: "#5a5457", marginTop: 4 }}>{b.items.map((i) => i.name).join(", ")}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", background: sc.bg, color: sc.fg, padding: "6px 12px", borderRadius: 12 }}>
              {b.status.toLowerCase()}
            </span>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, marginTop: 10 }}>{rupees(b.total)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {(b.status === "CONFIRMED" || b.status === "PENDING") && (
            <button onClick={() => void cancel(b.id)} style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          )}
          {b.status === "COMPLETED" && !b.review && (
            <button onClick={() => setReviewFor(reviewFor === b.id ? null : b.id)} className="bb-btn" style={{ padding: "9px 16px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Write a review
            </button>
          )}
          {b.status === "COMPLETED" && b.review && <span style={{ fontSize: 13, color: "#B06A85", fontWeight: 600, padding: "9px 0" }}>✓ Reviewed</span>}
        </div>
        {reviewFor === b.id && (
          <div style={{ marginTop: 16, padding: 18, borderRadius: 16, background: "rgba(235,200,211,.15)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => setReviewRating(r)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: r <= reviewRating ? "#D4AF37" : "rgba(28,28,28,.2)" }} aria-label={`${r} stars`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="bb-input"
              style={{ marginTop: 12, minHeight: 80, resize: "vertical" }}
              placeholder="Share your experience (min 10 characters)…"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <button onClick={() => void submitReview(b.id)} disabled={reviewText.length < 10} className="bb-btn" style={{ marginTop: 12, padding: "10px 22px", borderRadius: 12, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: reviewText.length < 10 ? 0.5 : 1 }}>
              Publish review
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardShell
      eyebrow="My BeautyBook"
      title={`Hello, ${user.name.split(" ")[0]}`}
      subtitle={`${user.loyaltyPoints} loyalty points · ${upcoming.length} upcoming`}
      active={tab}
      onSelect={(k) => setTab(k as Tab)}
      items={[
        { key: "bookings", label: "Bookings" },
        { key: "favorites", label: "Favorites" },
        { key: "notifications", label: "Notifications", badge: notifications.some((n) => !n.read) },
        { key: "profile", label: "Profile" },
      ]}
    >
      <div style={{ maxWidth: 900 }}>
        {msg && <p style={{ marginBottom: 18, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "bookings" && (
            <>
              {bookings.length === 0 && (
                <p style={{ fontSize: 15, color: "#5a5457" }}>
                  No bookings yet — <Link href="/explore" style={{ color: "#B06A85", fontWeight: 600 }}>explore salons</Link> to get started.
                </p>
              )}
              {upcoming.length > 0 && <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Upcoming</h2>}
              {upcoming.map(bookingCard)}
              {past.length > 0 && <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginTop: 12 }}>History</h2>}
              {past.map(bookingCard)}
            </>
          )}

          {tab === "favorites" && (
            <>
              {favorites.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>No favorites saved yet — tap ♡ on any salon.</p>}
              {favorites.map((f) => (
                <Link key={f.id} href={`/salon/${f.salon.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="bb-lift" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "18px 22px", borderRadius: 20, background: "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600 }}>{f.salon.name}</div>
                      <div style={{ fontSize: 13, color: "#5a5457", marginTop: 3 }}>
                        {f.salon.area.name}, {f.salon.area.city.name} · ★ {f.salon.rating.toFixed(1)}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#B06A85" }}>View →</span>
                  </div>
                </Link>
              ))}
            </>
          )}

          {tab === "notifications" && (
            <>
              {notifications.length > 0 && (
                <button onClick={() => void markAllRead()} style={{ alignSelf: "flex-start", padding: "9px 16px", borderRadius: 12, border: "1px solid rgba(28,28,28,.12)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Mark all read
                </button>
              )}
              {notifications.length === 0 && <p style={{ fontSize: 15, color: "#5a5457" }}>Nothing here yet.</p>}
              {notifications.map((n) => (
                <div key={n.id} style={{ padding: "16px 20px", borderRadius: 18, background: n.read ? "rgba(255,255,255,.6)" : "#fff", border: "1px solid rgba(28,28,28,.06)" }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{n.read ? "" : "● "}{n.title}</div>
                  <div style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>{n.body}</div>
                  <div style={{ fontSize: 12, color: "#5a5457", marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}

          {tab === "profile" && <ProfileTab onLogout={() => void logout().then(() => router.push("/"))} />}
        </div>
      </div>
    </DashboardShell>
  );
}

function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const save = async () => {
    if (!token) return;
    try {
      await api("/api/auth/me", { method: "PATCH", token, body: JSON.stringify({ name, phone: phone || undefined }) });
      await refreshUser();
      setMsg("Profile updated.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    }
  };

  const changePassword = async () => {
    if (!token) return;
    try {
      await api("/api/auth/change-password", { method: "POST", token, body: JSON.stringify({ currentPassword, newPassword }) });
      setMsg("Password changed — please log in again on other devices.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Password change failed");
    }
  };

  return (
    <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28, maxWidth: 520 }}>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Profile</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        <input className="bb-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Full name" />
        <input className="bb-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" />
        <button onClick={() => void save()} className="bb-btn" style={{ padding: "12px 0", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Save changes
        </button>
      </div>
      <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, marginTop: 30 }}>Security</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        <input className="bb-input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" aria-label="Current password" />
        <input className="bb-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" aria-label="New password" />
        <button onClick={() => void changePassword()} disabled={!currentPassword || newPassword.length < 8} style={{ padding: "12px 0", borderRadius: 14, border: "1px solid rgba(28,28,28,.15)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !currentPassword || newPassword.length < 8 ? 0.5 : 1 }}>
          Change password
        </button>
      </div>
      {msg && <p style={{ marginTop: 16, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}
      <button onClick={onLogout} style={{ marginTop: 26, padding: "11px 20px", borderRadius: 14, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Log out
      </button>
    </div>
  );
}
