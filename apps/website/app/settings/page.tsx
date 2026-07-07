"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const serif = "'Space Grotesk',sans-serif";

type Tab = "profile" | "security" | "notifications" | "privacy";

export default function SettingsPage() {
  const { user, token, loading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaSetupStarted, setTwoFaSetupStarted] = useState(false);
  const [twoFaPassword, setTwoFaPassword] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login?next=/settings");
  }, [loading, user, router]);

  useEffect(() => { if (user) { setName(user.name); setPhone(user.phone || ""); } }, [user]);

  const saveProfile = async () => {
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
      setMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Password change failed");
    }
  };

  const call = async (path: string, body: object, successMsg: string, after?: () => void) => {
    if (!token) return;
    try {
      await api(path, { method: "POST", token, body: JSON.stringify(body) });
      await refreshUser();
      setMsg(successMsg);
      after?.();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (loading || !user) return null;

  const tabStyle = (t: Tab) => ({
    padding: "11px 20px", borderRadius: 16, border: "none", fontSize: 14, fontWeight: 600 as const,
    cursor: "pointer", background: tab === t ? "#1C1C1C" : "rgba(255,255,255,.7)",
    color: tab === t ? "#FAF8F7" : "#4a4446",
    boxShadow: tab === t ? "0 6px 18px rgba(28,28,28,.14)" : "none",
  });

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(32px,5vh,56px) clamp(24px,5vw,40px) 80px" }}>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: "#B06A85" }}>Settings</span>
        <h1 style={{ fontFamily: serif, fontWeight: 500, fontSize: "clamp(34px,5vw,54px)", marginTop: 10 }}>Account settings</h1>

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <button style={tabStyle("profile")} onClick={() => setTab("profile")}>Profile</button>
          <button style={tabStyle("security")} onClick={() => setTab("security")}>Security</button>
          <button style={tabStyle("notifications")} onClick={() => setTab("notifications")}>Notifications</button>
          <button style={tabStyle("privacy")} onClick={() => setTab("privacy")}>Privacy</button>
        </div>

        {msg && <p style={{ marginTop: 18, fontSize: 14, color: "#B06A85", fontWeight: 600 }}>{msg}</p>}

        <div style={{ marginTop: 24 }}>
          {tab === "profile" && (
            <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Profile information</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
                <input className="bb-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                <input className="bb-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
                <input className="bb-input" value={user.email} disabled placeholder="Email (cannot change)" style={{ opacity: 0.6 }} />
                <button onClick={() => void saveProfile()} className="bb-btn" style={{ padding: "12px 0", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 6 }}>Save changes</button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Change password</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
                <input className="bb-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" />
                <input className="bb-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" />
                <button onClick={() => void changePassword()} disabled={!currentPassword || newPassword.length < 8} className="bb-btn" style={{ padding: "12px 0", borderRadius: 14, border: "1px solid rgba(28,28,28,.15)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: !currentPassword || newPassword.length < 8 ? 0.5 : 1 }}>Change password</button>
              </div>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(28,28,28,.08)" }}>
                <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Account verification</h2>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>
                      Email {user.emailVerified ? <span style={{ color: "#2e7d52" }}>✓ Verified</span> : <span style={{ color: "#a33" }}>· Not verified</span>}
                    </p>
                    {!user.emailVerified && (
                      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                        <input className="bb-input" value={emailToken} onChange={e => setEmailToken(e.target.value)} placeholder="Verification token (check Notifications)" style={{ flex: "1 1 240px" }} />
                        <button onClick={() => void call("/api/auth/verify-email", { token: emailToken }, "Email verified.", () => setEmailToken(""))} disabled={!emailToken} className="bb-btn" style={{ padding: "11px 18px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: emailToken ? 1 : 0.5 }}>Verify</button>
                        <button onClick={() => void call("/api/auth/resend-verification", {}, "Verification token sent to your notifications.")} style={{ padding: "11px 18px", borderRadius: 14, border: "1px solid rgba(28,28,28,.15)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Resend</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>
                      Phone {user.phoneVerified ? <span style={{ color: "#2e7d52" }}>✓ Verified</span> : <span style={{ color: "#a33" }}>· Not verified</span>}
                    </p>
                    {!user.phoneVerified && (
                      user.phone ? (
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                          {phoneOtpSent && (
                            <input className="bb-input" inputMode="numeric" maxLength={6} value={phoneCode} onChange={e => setPhoneCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" style={{ flex: "1 1 160px" }} />
                          )}
                          {phoneOtpSent ? (
                            <button onClick={() => void call("/api/auth/verify-otp", { code: phoneCode }, "Phone verified.", () => { setPhoneCode(""); setPhoneOtpSent(false); })} disabled={phoneCode.length !== 6} className="bb-btn" style={{ padding: "11px 18px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: phoneCode.length === 6 ? 1 : 0.5 }}>Verify code</button>
                          ) : (
                            <button onClick={() => void call("/api/auth/send-otp", {}, "Code sent to your notifications.", () => setPhoneOtpSent(true))} style={{ padding: "11px 18px", borderRadius: 14, border: "1px solid rgba(28,28,28,.15)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Send verification code</button>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: 14, color: "#5a5457", marginTop: 6 }}>Add a phone number in the Profile tab first.</p>
                      )
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(28,28,28,.08)" }}>
                <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Two-factor authentication</h2>
                {user.twoFactorEnabled ? (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 14, color: "#2e7d52", fontWeight: 600 }}>✓ Two-factor authentication is on. You&apos;ll enter a code at each login.</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <input className="bb-input" type="password" value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} placeholder="Confirm password to disable" style={{ flex: "1 1 240px" }} />
                      <button onClick={() => void call("/api/auth/2fa/disable", { password: twoFaPassword }, "Two-factor authentication disabled.", () => setTwoFaPassword(""))} disabled={!twoFaPassword} style={{ padding: "11px 18px", borderRadius: 14, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: twoFaPassword ? 1 : 0.5 }}>Disable 2FA</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 14, color: "#5a5457" }}>Add a second step at login: we send a 6-digit code to your account notifications.</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      {twoFaSetupStarted && (
                        <input className="bb-input" inputMode="numeric" maxLength={6} value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" style={{ flex: "1 1 160px" }} />
                      )}
                      {twoFaSetupStarted ? (
                        <button onClick={() => void call("/api/auth/2fa/enable", { code: twoFaCode }, "Two-factor authentication enabled.", () => { setTwoFaCode(""); setTwoFaSetupStarted(false); })} disabled={twoFaCode.length !== 6} className="bb-btn" style={{ padding: "11px 18px", borderRadius: 14, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: twoFaCode.length === 6 ? 1 : 0.5 }}>Confirm &amp; enable</button>
                      ) : (
                        <button onClick={() => void call("/api/auth/2fa/setup", {}, "Setup code sent to your notifications.", () => setTwoFaSetupStarted(true))} className="bb-btn" style={{ padding: "11px 18px", borderRadius: 14, border: "none", background: "#B06A85", color: "#FAF8F7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Enable 2FA</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(28,28,28,.08)" }}>
                <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Sessions</h2>
                <p style={{ fontSize: 14, color: "#5a5457", marginTop: 8 }}>Log out of all devices and sessions.</p>
                <button onClick={async () => { await api("/api/security/sessions/revoke-all", { method: "POST", token }).catch(() => {}); void logout().then(() => router.push("/login")); }} style={{ marginTop: 14, padding: "11px 20px", borderRadius: 14, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Revoke all sessions</button>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Notification preferences</h2>
              <p style={{ fontSize: 14, color: "#5a5457", marginTop: 8 }}>Manage how you receive notifications.</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                {["Booking reminders", "Promotions & offers", "Review reminders", "Payment updates", "Membership expiry", "Birthday offers"].map(item => (
                  <label key={item} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: "#B06A85" }} />
                    {item}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
                {["Email", "Push notifications", "SMS"].map(method => (
                  <label key={method} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: "#B06A85" }} />
                    {method}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === "privacy" && (
            <div style={{ borderRadius: 22, background: "#fff", border: "1px solid rgba(28,28,28,.06)", padding: 28 }}>
              <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 600 }}>Privacy & data</h2>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Download your data</h3>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>Get a copy of your personal data in JSON format.</p>
                  <button onClick={async () => { try { const res = await api<{ user: any; bookings: any[] }>("/api/auth/me", { token }); const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "beautybook-data.json"; a.click(); URL.revokeObjectURL(url); } catch {} }} className="bb-btn-ghost" style={{ marginTop: 10, padding: "10px 18px", borderRadius: 14, border: "1px solid rgba(28,28,28,.12)", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Download</button>
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Delete account</h3>
                  <p style={{ fontSize: 14, color: "#5a5457", marginTop: 4 }}>Permanently delete your account and all associated data.</p>
                  <button onClick={() => { if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) { void logout().then(() => router.push("/")); } }} style={{ marginTop: 10, padding: "10px 18px", borderRadius: 14, border: "1px solid rgba(163,51,51,.3)", background: "transparent", color: "#a33", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Delete my account</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
