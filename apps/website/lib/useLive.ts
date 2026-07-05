"use client";

import { useEffect, useRef } from "react";

// Polls `refresh` on an interval while the tab is visible, and immediately
// when the tab regains focus — keeps dashboards live without WebSockets
// (which the serverless deployment target doesn't support).
export function useLive(refresh: () => void | Promise<void>, intervalMs = 15000) {
  const fnRef = useRef(refresh);
  fnRef.current = refresh;

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) void fnRef.current();
    };
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (!document.hidden) void fnRef.current();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
