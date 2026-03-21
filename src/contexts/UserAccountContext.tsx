/**
 * MAIN ACCOUNT SYSTEM — Supabase Auth (email/password)
 *
 * Completely isolated from the secret/private system (AuthContext).
 * Uses: supabase.auth, user_profiles table, user_progress table
 * Storage: puzzlecraft-* localStorage keys
 * Routes: all public routes + /account
 *
 * This provider must NEVER reference private_session, AuthContext,
 * or any authorized_users/profiles/conversations tables.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface UserAccount {
  id: string;
  email: string;
  displayName: string | null;
  isPremium: boolean;
}

interface UserAccountContextType {
  account: UserAccount | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** True when local data exists and user just authenticated — triggers merge modal */
  pendingMerge: boolean;
  resolveMerge: (strategy: "merge" | "keep-account") => Promise<void>;
}

const UserAccountContext = createContext<UserAccountContextType | null>(null);

// ── localStorage keys we sync ──
const COMPLETIONS_KEY = "puzzlecraft-completions";
const SOLVES_KEY = "puzzlecraft-solves";
const ENDLESS_KEY = "puzzlecraft_endless_sessions";
const DAILY_KEY = "puzzlecraft-daily-completions";
const MERGE_HANDLED_KEY = "puzzlecraft-merge-handled";

function hasLocalData(): boolean {
  try {
    const c = localStorage.getItem(COMPLETIONS_KEY);
    const s = localStorage.getItem(SOLVES_KEY);
    return (!!c && c !== "[]") || (!!s && s !== "[]");
  } catch {
    return false;
  }
}

function getLocalBlob(key: string, fallback: any = []) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

async function fetchProfile(userId: string): Promise<UserAccount | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("display_name, is_premium")
    .eq("id", userId)
    .single();
  if (!data) return null;
  // get email from auth
  const { data: { user } } = await supabase.auth.getUser();
  return {
    id: userId,
    email: user?.email || "",
    displayName: data.display_name,
    isPremium: data.is_premium,
  };
}

async function pushProgressToDb(userId: string) {
  const completions = getLocalBlob(COMPLETIONS_KEY, []);
  const solves = getLocalBlob(SOLVES_KEY, []);
  const endless = getLocalBlob(ENDLESS_KEY, []);
  const daily = getLocalBlob(DAILY_KEY, {});

  await supabase.from("user_progress").upsert({
    user_id: userId,
    completions,
    solves,
    endless_data: endless,
    daily_data: daily,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function pullProgressFromDb(userId: string) {
  const { data } = await supabase
    .from("user_progress")
    .select("completions, solves, endless_data, daily_data")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  if (Array.isArray(data.completions) && data.completions.length > 0)
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(data.completions));
  if (Array.isArray(data.solves) && data.solves.length > 0)
    localStorage.setItem(SOLVES_KEY, JSON.stringify(data.solves));
  if (Array.isArray(data.endless_data) && data.endless_data.length > 0)
    localStorage.setItem(ENDLESS_KEY, JSON.stringify(data.endless_data));
  if (data.daily_data && typeof data.daily_data === "object" && Object.keys(data.daily_data).length > 0)
    localStorage.setItem(DAILY_KEY, JSON.stringify(data.daily_data));
}

async function mergeProgressToDb(userId: string) {
  // Get existing remote data
  const { data: remote } = await supabase
    .from("user_progress")
    .select("completions, solves, endless_data, daily_data")
    .eq("user_id", userId)
    .single();

  const localCompletions = getLocalBlob(COMPLETIONS_KEY, []);
  const localSolves = getLocalBlob(SOLVES_KEY, []);
  const localEndless = getLocalBlob(ENDLESS_KEY, []);
  const localDaily = getLocalBlob(DAILY_KEY, {});

  // Merge arrays by deduplicating on id/date fields
  const remoteCompletions = Array.isArray(remote?.completions) ? remote.completions : [];
  const remoteSolves = Array.isArray(remote?.solves) ? remote.solves : [];
  const remoteEndless = Array.isArray(remote?.endless_data) ? remote.endless_data : [];
  const remoteDaily = (remote?.daily_data && typeof remote.daily_data === "object") ? remote.daily_data : {};

  const mergedCompletions = dedupeByKey([...remoteCompletions, ...localCompletions], "date");
  const mergedSolves = dedupeByKey([...remoteSolves, ...localSolves], "id");
  const mergedEndless = dedupeByKey([...remoteEndless, ...localEndless], "id");
  const mergedDaily = { ...remoteDaily as Record<string, unknown>, ...localDaily };

  await supabase.from("user_progress").upsert({
    user_id: userId,
    completions: mergedCompletions,
    solves: mergedSolves,
    endless_data: mergedEndless,
    daily_data: mergedDaily,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // Update local with merged data
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(mergedCompletions));
  localStorage.setItem(SOLVES_KEY, JSON.stringify(mergedSolves));
  localStorage.setItem(ENDLESS_KEY, JSON.stringify(mergedEndless));
  localStorage.setItem(DAILY_KEY, JSON.stringify(mergedDaily));
}

function dedupeByKey(arr: any[], key: string): any[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = String(item?.[key] ?? JSON.stringify(item));
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function UserAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMerge, setPendingMerge] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleSession = useCallback(async (session: Session | null, event?: string) => {
    if (!session?.user) {
      setAccount(null);
      setLoading(false);
      return;
    }
    const profile = await fetchProfile(session.user.id);
    setAccount(profile);

    // Only prompt merge on a fresh sign-in, not on token refreshes or initial session restore.
    // Use a localStorage flag keyed to the user ID so it's only shown once per account.
    const mergeKey = `${MERGE_HANDLED_KEY}-${session.user.id}`;
    const alreadyHandled = localStorage.getItem(mergeKey) === "1";

    if (!alreadyHandled && (event === "SIGNED_IN") && hasLocalData()) {
      setPendingMerge(true);
      setPendingUserId(session.user.id);
    } else if (!alreadyHandled && !hasLocalData()) {
      // No local data and first time — pull from DB and mark handled
      await pullProgressFromDb(session.user.id);
      localStorage.setItem(mergeKey, "1");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleSession(session, event);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, "INITIAL_SESSION");
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  // Sync progress to DB periodically for logged-in users
  useEffect(() => {
    if (!account) return;
    const interval = setInterval(() => {
      pushProgressToDb(account.id);
    }, 60_000); // every 60s
    return () => clearInterval(interval);
  }, [account]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Push final progress before signing out
    if (account) {
      await pushProgressToDb(account.id);
    }
    await supabase.auth.signOut();
    setAccount(null);
  }, [account]);

  const resolveMerge = useCallback(async (strategy: "merge" | "keep-account") => {
    if (!pendingUserId) return;
    if (strategy === "merge") {
      await mergeProgressToDb(pendingUserId);
    } else {
      // Keep account data only — overwrite local with remote
      await pullProgressFromDb(pendingUserId);
    }
    setPendingMerge(false);
    setPendingUserId(null);
  }, [pendingUserId]);

  return (
    <UserAccountContext.Provider value={{ account, loading, signUp, signIn, signOut, pendingMerge, resolveMerge }}>
      {children}
    </UserAccountContext.Provider>
  );
}

export function useUserAccount() {
  const ctx = useContext(UserAccountContext);
  if (!ctx) throw new Error("useUserAccount must be used within UserAccountProvider");
  return ctx;
}
