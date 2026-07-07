"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself (which the regular error.tsx
// cannot). Reports to Sentry when configured; tree-shaken out otherwise.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
    }
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "'Hanken Grotesk',sans-serif", background: "#FAF8F7", color: "#1C1C1C" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: "clamp(36px,6vw,60px)" }}>Something went wrong</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#575153", marginTop: 14 }}>Please refresh the page to continue.</p>
            <a href="/" style={{ display: "inline-block", marginTop: 24, borderRadius: 12, background: "#1C1C1C", color: "#FAF8F7", fontSize: 15, fontWeight: 600, padding: "13px 26px", textDecoration: "none" }}>Back to home</a>
          </div>
        </div>
      </body>
    </html>
  );
}
