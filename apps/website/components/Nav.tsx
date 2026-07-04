"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const navLinks: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }> = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Services", href: "/services" },
  { label: "Offers", href: "/offers" },
  {
    label: "More",
    href: "#",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Beauty Tips", href: "/tips" },
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "Memberships", href: "/memberships" },
      { label: "AI Assistant", href: "/ai-assistant" },
      { label: "Chat", href: "/chat" },
      { label: "Support", href: "/support" },
    ],
  },
  { label: "Become a Partner", href: "/partner" },
  { label: "About", href: "/about" },
];

export default function Nav() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 32,
        padding: "18px clamp(24px,5vw,72px)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        background: "rgba(250,248,247,.72)",
        borderBottom: "1px solid rgba(28,28,28,.06)",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: ".12em",
          color: "#1C1C1C",
          textDecoration: "none",
        }}
      >
        BeautyBook
      </Link>

      {/* Desktop nav */}
      <div className="bb-nav-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {navLinks.map((item) =>
          item.children ? (
            <div key={item.label} style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 200)}
                style={{ fontSize: 14, fontWeight: 500, color: "#4a4446", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {item.label} ▾
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 8, background: "#fff", borderRadius: 16, border: "1px solid rgba(28,28,28,.08)", boxShadow: "0 20px 50px -20px rgba(28,28,28,.3)", padding: 8, minWidth: 180, zIndex: 50 }}>
                  {item.children.map(c => (
                    <Link key={c.label} href={c.href} className="bb-navlink" style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#4a4446", textDecoration: "none", padding: "10px 14px", borderRadius: 10 }}>{c.label}</Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link key={item.label} href={item.href} className="bb-navlink" style={{ fontSize: 14, fontWeight: 500, color: "#4a4446", textDecoration: "none", whiteSpace: "nowrap" }}>
              {item.label}
            </Link>
          )
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="bb-nav-links" style={{ display: "none", background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#1C1C1C" }}>☰</button>

        {user ? (
          <>
            <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}>
              {user.name.split(" ")[0]}
            </Link>
            {(user.role === "OWNER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <Link href={user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? "/admin" : "/salon-dashboard"} style={{ fontSize: 13, fontWeight: 600, color: "#B06A85", textDecoration: "none", padding: "9px 12px", border: "1px solid rgba(176,106,133,.3)", borderRadius: 14 }}>
                Dashboard
              </Link>
            )}
            {user.role === "STAFF" && (
              <Link href="/staff-dashboard" style={{ fontSize: 13, fontWeight: 600, color: "#B06A85", textDecoration: "none", padding: "9px 12px", border: "1px solid rgba(176,106,133,.3)", borderRadius: 14 }}>
                Staff Dashboard
              </Link>
            )}
            <button onClick={() => void logout()} className="bb-btn" style={{ fontSize: 14, fontWeight: 600, color: "#FAF8F7", border: "none", cursor: "pointer", padding: "11px 22px", borderRadius: 20, background: "#1C1C1C", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}>Login</Link>
            <Link href="/signup" className="bb-btn" style={{ fontSize: 14, fontWeight: 600, color: "#FAF8F7", textDecoration: "none", padding: "11px 22px", borderRadius: 20, background: "#1C1C1C", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(28,28,28,.14)" }}>Sign Up</Link>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, top: 72, background: "#FAF8F7", zIndex: 39, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {navLinks.map(item => (
            item.children ? item.children.map(c => (
              <Link key={c.label} href={c.href} onClick={() => setMobileOpen(false)} style={{ fontSize: 16, fontWeight: 500, color: "#1C1C1C", textDecoration: "none" }}>{c.label}</Link>
            )) : (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} style={{ fontSize: 16, fontWeight: 500, color: "#1C1C1C", textDecoration: "none" }}>{item.label}</Link>
            )
          ))}
          {user?.role === "STAFF" && (
            <Link href="/staff-dashboard" onClick={() => setMobileOpen(false)} style={{ fontSize: 16, fontWeight: 500, color: "#B06A85", textDecoration: "none" }}>Staff Dashboard</Link>
          )}
        </div>
      )}
    </nav>
  );
}
