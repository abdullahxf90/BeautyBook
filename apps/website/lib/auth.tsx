"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, UserInfo } from "./api";

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const ACCESS_KEY = "bb_access";
const REFRESH_KEY = "bb_refresh";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((u: UserInfo, access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    setToken(access);
    setUser(u);
  }, []);

  useEffect(() => {
    const boot = async () => {
      const access = localStorage.getItem(ACCESS_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!access) return setLoading(false);
      try {
        const { user: u } = await api<{ user: UserInfo }>("/api/auth/me", { token: access });
        setToken(access);
        setUser(u);
      } catch {
        if (refresh) {
          try {
            const tokens = await api<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
              method: "POST",
              body: JSON.stringify({ refreshToken: refresh }),
            });
            const { user: u } = await api<{ user: UserInfo }>("/api/auth/me", { token: tokens.accessToken });
            applySession(u, tokens.accessToken, tokens.refreshToken);
          } catch {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void boot();
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: UserInfo; accessToken: string; refreshToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    applySession(res.user, res.accessToken, res.refreshToken);
  }, [applySession]);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string) => {
    const res = await api<{ user: UserInfo; accessToken: string; refreshToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone: phone || undefined }),
    });
    applySession(res.user, res.accessToken, res.refreshToken);
  }, [applySession]);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
    setToken(null);
    if (refresh) {
      await api("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: refresh }) }).catch(() => {});
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const { user: u } = await api<{ user: UserInfo }>("/api/auth/me", { token });
    setUser(u);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout, refreshUser }),
    [user, token, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
