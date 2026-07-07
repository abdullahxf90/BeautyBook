"use client";

import { useEffect, useState } from "react";

// Toggles between the light theme (default) and a full-black dark theme.
// Dark mode is applied via a root-level CSS filter (see globals.css) so it
// covers the entire inline-styled app; the choice persists in localStorage.
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("bb_theme", next);
    } catch {
      /* ignore storage errors (private mode) */
    }
    setDark(!dark);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      data-no-invert
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: compact ? "auto" : 40,
        height: 40,
        gap: compact ? 8 : 0,
        padding: compact ? "0 14px" : 0,
        borderRadius: compact ? 14 : 20,
        border: "1px solid rgba(28,28,28,.14)",
        background: "rgba(255,255,255,.7)",
        color: "#1C1C1C",
        fontSize: compact ? 15 : 17,
        fontWeight: 600,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      {compact && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
