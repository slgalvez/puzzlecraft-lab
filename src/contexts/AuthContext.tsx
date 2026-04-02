/**
 * SECRET / PRIVATE SYSTEM — Custom JWT auth via private-login edge function
 *
 * Completely isolated from the main account system (UserAccountContext).
 * Uses: private-login edge function, authorized_users table, profiles table
 * Storage: private_session (localStorage), private_access_grant (sessionStorage)
 * Routes: /p/*
 *
 * This provider must NEVER reference supabase.auth, UserAccountContext,
 * or any user_profiles/user_progress tables.
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearPrivateAccessGrant } from "@/lib/privateAccessGrant";

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
  // This runs in the background and must NEVER block app entry
  useEffect(() => {
    if (!token || !user) {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    const checkSession = async () => {
      try {
        console.debug("[auth] checking session validity...");
        // 10s timeout so a slow network never blocks the UI
        const timeoutPromise = new Promise<{ data: null; error: "timeout" }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: "timeout" }), 10_000)
        );
        const invokePromise = supabase.functions.invoke("messaging", {
          body: { action: "verify-session", token },
        });
        const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

        if (error === "timeout") {
          console.warn("[auth] session check timed out — skipping");
          return; // Don't invalidate session on timeout
        }

        let sessionGone = false;

        if (data?.error === "Session ended" || data?.error === "Access unavailable") {
          sessionGone = true;
        }

        if (error && typeof error === "object") {
          const maybeError = error as {
            context?: { status?: number; json?: () => Promise<unknown>; clone?: () => { json?: () => Promise<unknown> } };
          };

          if (maybeError.context?.status === 401) {
            sessionGone = true;
          }

          if (!sessionGone && maybeError.context) {
            try {
              const errBody = typeof maybeError.context.clone === "function"
                ? await maybeError.context.clone().json?.()
                : await maybeError.context.json?.();

              if ((errBody as { error?: string } | null)?.error === "Session ended" || (errBody as { error?: string } | null)?.error === "Access unavailable") {
                sessionGone = true;
              }
            } catch {
              // ignore malformed error bodies
            }
          }
        }

        if (sessionGone) {
          console.debug("[auth] session invalidated remotely");
          if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
          setToken(null);
          setSessionEnded(true);
        } else {
          console.debug("[auth] session valid");
        }
      } catch {
        // Network error — ignore, will retry
        console.debug("[auth] session check network error — skipping");
      }
    };

    // Delay first check so it doesn't race with initial page load
    const initialTimer = setTimeout(checkSession, 3000);

    checkIntervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => {
      clearTimeout(initialTimer);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [token, user]);

  const signIn = useCallback(async (firstName: string, lastName: string, password: string) => {
    try {
      console.debug("[auth] signIn: calling private-login...");
      const invokePromise = supabase.functions.invoke("private-login", {
        body: { first_name: firstName.trim(), last_name: lastName.trim(), password },
      });
      // 30s timeout so signIn never hangs forever
      const timeoutPromise = new Promise<{ data: null; error: string }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: "timeout" }), 30_000)
      );
      const result = await Promise.race([invokePromise, timeoutPromise]);
      const { data, error } = result;

      console.debug("[auth] signIn result:", JSON.stringify({
        hasData: !!data,
        hasToken: !!data?.token,
        errorType: error ? (typeof error === "string" ? error : error?.name || "object") : null,
        errorMsg: error ? (typeof error === "string" ? error : error?.message || String(error)) : null,
        dataKeys: data ? Object.keys(data) : null,
      }));

      if (error) {
        if (typeof error === "string" && error === "timeout") {
          return { error: "Connection timed out — please try again" };
        }
        // supabase-js wraps non-2xx responses — try to get the response body
        const errObj = error as { context?: { json?: () => Promise<unknown> } };
        if (errObj.context?.json) {
          try {
            const body = await errObj.context.json() as { error?: string };
            console.debug("[auth] signIn: function returned error body:", body);
          } catch {}
        }
        return { error: "Access unavailable" };
      }
      if (!data?.token) {
        console.debug("[auth] signIn: no token in response, data:", JSON.stringify(data));
        return { error: "Access unavailable" };
      }
      console.debug("[auth] signIn: success, setting session");
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, token: data.token }));
      localStorage.setItem("private_last_active", String(Date.now()));
      setUser(data.user);
      setToken(data.token);
      setSessionEnded(false);
      return { error: null };
    } catch (e) {
      console.warn("[auth] signIn: exception", e);
      return { error: "Connection failed — please try again" };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    clearPrivateAccessGrant();
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
