"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const navLinks: Array<[string, string]> = [
  ["Home", "/"],
  ["Explore", "/explore"],
  ["Services", "/explore#services"],
  ["Offers", "/#offers"],
  ["Become a Partner", "/partner"],
  ["About", "/about"],
];

export default function Nav() {
  const { user, logout } = useAuth();

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
      <div className="bb-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
        {navLinks.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="bb-navlink"
            style={{
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: ".01em",
              color: "#4a4446",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {user ? (
          <>
            <Link
              href="/dashboard"
              style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}
            >
              {user.name.split(" ")[0]}
            </Link>
            <button
              onClick={() => void logout()}
              className="bb-btn"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FAF8F7",
                border: "none",
                cursor: "pointer",
                padding: "11px 22px",
                borderRadius: 20,
                background: "#1C1C1C",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 18px rgba(28,28,28,.14)",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{ fontSize: 14, fontWeight: 600, color: "#1C1C1C", textDecoration: "none", padding: "9px 14px" }}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bb-btn"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#FAF8F7",
                textDecoration: "none",
                padding: "11px 22px",
                borderRadius: 20,
                background: "#1C1C1C",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 18px rgba(28,28,28,.14)",
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
