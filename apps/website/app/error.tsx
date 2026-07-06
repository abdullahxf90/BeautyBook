"use client";

import { useEffect } from "react";

// Route-level error boundary (Next.js App Router). Kept self-contained so it
// stays resilient even if the failure came from shared layout components.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces client render/runtime errors for diagnosis; wire to Sentry here when configured.
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(40px,7vw,72px)", color: "#1C1C1C" }}>Something went wrong</h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: "#5a5457", marginTop: 14 }}>
          We hit an unexpected snag. Please try again — if it keeps happening, refresh the page.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{ borderRadius: 20, border: "none", background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "14px 28px", cursor: "pointer" }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{ borderRadius: 20, border: "1px solid rgba(28,28,28,.16)", color: "#1C1C1C", fontSize: 15, fontWeight: 600, padding: "14px 28px", textDecoration: "none" }}
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
