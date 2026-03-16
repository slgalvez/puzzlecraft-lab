import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PrivateUser {
  id: string;
  first_name: string;
  last_name: string;
  role: "admin" | "user";
}

interface AuthContextType {
  user: PrivateUser | null;
  loading: boolean;
  token: string | null;
  signIn: (firstName: string, lastName: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<Pick<PrivateUser, "first_name" | "last_name">>) => void;
}

const SESSION_KEY = "private_session";

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

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      setToken(session.token);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (firstName: string, lastName: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("private-login", {
        body: { first_name: firstName.trim(), last_name: lastName.trim(), password },
      });
      if (error || !data?.token) return { error: "Access unavailable" };
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user: data.user, token: data.token }));
      setUser(data.user);
      setToken(data.token);
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

  return (
    <AuthContext.Provider value={{ user, loading, token, signIn, signOut }}>
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
      signIn: async () => ({ error: "Auth not ready" }),
      signOut: async () => {},
    } as AuthContextType;
  }
  return ctx;
}
