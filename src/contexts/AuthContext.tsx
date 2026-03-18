import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface PrivateUser {
  id: string;
  first_name: string;
  last_name: string;
  role: "admin" | "user";
  focus_loss_protection: boolean;
}

interface AuthContextType {
  user: PrivateUser | null;
  loading: boolean;
  token: string | null;
  sessionEnded: boolean;
  signIn: (firstName: string, lastName: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearSessionEnded: () => void;
  updateUser: (updates: Partial<Pick<PrivateUser, "first_name" | "last_name">>) => void;
}

const SESSION_KEY = "private_session";
const SESSION_CHECK_INTERVAL = 30_000; // 30s

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredSession(): { user: PrivateUser; token: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payloadB64 = parsed.token?.split(".")?.[1];
    if (!payloadB64) return null;
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PrivateUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
    setLoading(false);
  }, []);

  // Periodic session validity check — detects if another login invalidated this session
  useEffect(() => {
    if (!token || !user) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("messaging", {
          body: { action: "verify-session", token },
        });

        // Handle session-end from either data or error
        let sessionGone = false;
        if (data?.error === "Session ended" || data?.error === "Access unavailable") {
          sessionGone = true;
        }
        if (error) {
          try {
            const errBody = typeof error.message === "string" ? JSON.parse(error.message) : null;
            if (errBody?.error === "Session ended" || errBody?.error === "Access unavailable") {
              sessionGone = true;
            }
          } catch { /* not JSON */ }
        }

        if (sessionGone) {
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
          setToken(null);
          setSessionEnded(true);
        }
      } catch {
        // Network error — ignore, will retry
      }
    };

    checkIntervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [token, user]);

  const signIn = useCallback(async (firstName: string, lastName: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("private-login", {
        body: { first_name: firstName.trim(), last_name: lastName.trim(), password },
      });
      if (error || !data?.token) return { error: "Access unavailable" };
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, token: data.token }));
      localStorage.setItem("private_last_active", String(Date.now()));
      setUser(data.user);
      setToken(data.token);
      setSessionEnded(false);
      return { error: null };
    } catch {
      return { error: "Access unavailable" };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("private_access_grant");
    setUser(null);
    setToken(null);
  }, []);

  const clearSessionEnded = useCallback(() => {
    setSessionEnded(false);
  }, []);

  const updateUser = useCallback((updates: Partial<Pick<PrivateUser, "first_name" | "last_name">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          parsed.user = updated;
          localStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        } catch {}
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, sessionEnded, signIn, signOut, clearSessionEnded, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: true,
      token: null,
      sessionEnded: false,
      signIn: async () => ({ error: "Auth not ready" }),
      signOut: async () => {},
      clearSessionEnded: () => {},
      updateUser: () => {},
    } as AuthContextType;
  }
  return ctx;
}
