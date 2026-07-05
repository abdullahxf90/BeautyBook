"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    FB?: {
      init: (config: { appId: string; version: string; cookie?: boolean }) => void;
      login: (cb: (res: { authResponse?: { accessToken: string } }) => void, opts: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.id = id;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Google / Facebook sign-in. Buttons only render for providers that are
 * configured via NEXT_PUBLIC_GOOGLE_CLIENT_ID / NEXT_PUBLIC_FACEBOOK_APP_ID,
 * so nothing appears until real credentials exist.
 */
export default function SocialLoginButtons({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const { socialLogin } = useAuth();
  const googleRef = useRef<HTMLDivElement>(null);
  const [fbReady, setFbReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const finish = useCallback(async (provider: "GOOGLE" | "FACEBOOK", providerToken: string) => {
    setBusy(true);
    try {
      await socialLogin(provider, providerToken);
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Social login failed");
    } finally {
      setBusy(false);
    }
  }, [socialLogin, onSuccess, onError]);

  // Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    void loadScript("https://accounts.google.com/gsi/client", "google-gsi").then(() => {
      if (cancelled || !window.google || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => void finish("GOOGLE", res.credential),
      });
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        shape: "pill",
        text: "continue_with",
      });
    }).catch(() => onError("Could not load Google sign-in"));
    return () => { cancelled = true; };
  }, [finish, onError]);

  // Facebook SDK
  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: FACEBOOK_APP_ID, version: "v19.0", cookie: true });
      setFbReady(true);
    };
    void loadScript("https://connect.facebook.net/en_US/sdk.js", "facebook-jssdk").then(() => {
      // fbAsyncInit fires automatically; handle the already-loaded case too
      if (window.FB && !fbReady) { window.fbAsyncInit?.(); }
    }).catch(() => onError("Could not load Facebook sign-in"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const facebookLogin = () => {
    window.FB?.login((res) => {
      if (res.authResponse?.accessToken) void finish("FACEBOOK", res.authResponse.accessToken);
      else onError("Facebook login was cancelled");
    }, { scope: "public_profile,email" });
  };

  if (!GOOGLE_CLIENT_ID && !FACEBOOK_APP_ID) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: "rgba(28,28,28,.1)" }} />
        <span style={{ fontSize: 13, color: "#5a5457" }}>or continue with</span>
        <span style={{ flex: 1, height: 1, background: "rgba(28,28,28,.1)" }} />
      </div>
      {GOOGLE_CLIENT_ID && <div ref={googleRef} style={{ display: "flex", justifyContent: "center" }} />}
      {FACEBOOK_APP_ID && (
        <button
          type="button"
          onClick={facebookLogin}
          disabled={!fbReady || busy}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "12px 0", borderRadius: 22, border: "1px solid rgba(28,28,28,.15)",
            background: "#1877F2", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", opacity: !fbReady || busy ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>
      )}
    </div>
  );
}
