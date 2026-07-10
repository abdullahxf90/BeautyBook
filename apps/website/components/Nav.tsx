"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import ThemeToggle from "./ThemeToggle";

const navLinks: Array<{ label: string; href: string }> = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Services", href: "/services" },
  { label: "Offers", href: "/offers" },
  { label: "Become a Partner", href: "/partner" },
  { label: "About", href: "/about" },
];

// Kept out of the top bar (per request) but still reachable from the mobile
// menu and the footer.
const quickLinks: Array<{ label: string; href: string }> = [
  { label: "Smart Search", href: "/smart-search" },
  { label: "Gift Cards", href: "/gift-cards" },
  { label: "Memberships", href: "/memberships" },
  { label: "AI Assistant", href: "/ai-assistant" },
  { label: "Blog", href: "/blog" },
  { label: "Beauty Tips", href: "/tips" },
  { label: "Chat", href: "/chat" },
  { label: "Support", href: "/support" },
];

// Each role lands on its own dashboard.
export function dashboardPath(role?: string): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "OWNER" || role === "MANAGER" || role === "RECEPTIONIST") return "/salon-dashboard";
  if (role === "STAFF") return "/staff";
  return "/dashboard";
}

export default function Nav() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const homeDash = dashboardPath(user?.role);

  return (
    <>
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 32,
        padding: "16px clamp(24px,5vw,72px)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        background: "rgba(250,248,247,.7)",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontSize: 21,
          fontWeight: 600,
          letterSpacing: "-.02em",
          color: "#1C1C1C",
          textDecoration: "none",
        }}
      >
        BeautyBook
      </Link>

      {/* Desktop nav */}
      <div className="bb-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {navLinks.map((item) => (
          <Link key={item.label} href={item.href} className="bb-navlink" style={{ fontSize: 14, fontWeight: 500, color: "#4a4446", textDecoration: "none", whiteSpace: "nowrap" }}>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="bb-nav-links" style={{ display: "none", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#1C1C1C" }}>☰</button>

        {user ? (
          <>
            <Link href={homeDash} style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}>
              {user.name.split(" ")[0]}
            </Link>
            <Link href={homeDash} style={{ fontSize: 13, fontWeight: 600, color: "#B06A85", textDecoration: "none", padding: "9px 12px", border: "1px solid rgba(176,106,133,.3)", borderRadius: 14 }}>
              {homeDash === "/admin" ? "Admin" : homeDash === "/salon-dashboard" ? "My Shop" : homeDash === "/staff" ? "My Schedule" : "Dashboard"}
            </Link>
            <button onClick={() => void logout()} className="bb-btn" style={{ fontSize: 14, fontWeight: 600, color: "#FAF8F7", border: "none", cursor: "pointer", padding: "10px 20px", borderRadius: 12, background: "#1C1C1C", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}>Login</Link>
            <Link href="/signup" className="bb-btn" style={{ fontSize: 14, fontWeight: 600, color: "#FAF8F7", textDecoration: "none", padding: "10px 20px", borderRadius: 12, background: "#1C1C1C", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}>Sign Up</Link>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, top: 72, background: "#FAF8F7", zIndex: 39, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          {[...navLinks, ...quickLinks].map(item => (
            <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} style={{ fontSize: 16, fontWeight: 500, color: "#1C1C1C", textDecoration: "none" }}>{item.label}</Link>
          ))}
          {user?.role === "STAFF" && (
            <Link href="/staff" onClick={() => setMobileOpen(false)} style={{ fontSize: 16, fontWeight: 500, color: "#B06A85", textDecoration: "none" }}>Staff Dashboard</Link>
          )}
          <div style={{ marginTop: 8 }}><ThemeToggle compact /></div>
        </div>
      )}
    </nav>
    </>
  );
}
