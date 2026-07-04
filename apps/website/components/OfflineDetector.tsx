"use client";

import { useEffect, useState } from "react";

export default function OfflineDetector() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onOff = () => setOffline(true);
    const onOn = () => setOffline(false);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, []);

  if (!offline) return null;
  return <div className="bb-offline">You are offline — some features may be unavailable.</div>;
}
