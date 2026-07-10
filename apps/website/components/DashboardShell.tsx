"use client";

import Nav from "./Nav";
import Footer from "./Footer";

export interface DashItem {
  key: string;
  label: string;
  badge?: boolean;
}

// Shared dashboard chrome: a left-side menu + main content area, used by the
// customer, shop (seller) and admin dashboards so each role gets the same
// left-navigation layout.
export default function DashboardShell({
  eyebrow,
  title,
  subtitle,
  items,
  active,
  onSelect,
  children,
  headerRight,
  footerSlot,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  items: DashItem[];
  active: string;
  onSelect: (key: string) => void;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  footerSlot?: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <div
        className="bb-dash-layout"
        style={{ maxWidth: 1320, margin: "0 auto", padding: "clamp(18px,3vh,30px) clamp(16px,4vw,40px) 90px", display: "flex", gap: 28, alignItems: "flex-start" }}
      >
        <aside className="bb-dash-side" style={{ position: "sticky", top: 82, flex: "0 0 240px", width: 240 }}>
          <div style={{ padding: "2px 6px 16px" }}>
            {eyebrow && (
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "#B06A85" }}>{eyebrow}</div>
            )}
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: "-.02em" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: "#575153", marginTop: 4 }}>{subtitle}</div>}
          </div>
          <nav className="bb-dash-menu" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {items.map((it) => (
              <button
                key={it.key}
                onClick={() => onSelect(it.key)}
                style={{
                  textAlign: "left",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  background: active === it.key ? "#1C1C1C" : "transparent",
                  color: active === it.key ? "#FAF8F7" : "#4a4446",
                }}
              >
                {it.label}
                {it.badge ? " ●" : ""}
              </button>
            ))}
          </nav>
          {footerSlot && <div style={{ marginTop: 16, padding: "0 6px" }}>{footerSlot}</div>}
        </aside>
        <main style={{ flex: "1 1 auto", minWidth: 0 }}>
          {headerRight && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>{headerRight}</div>}
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
