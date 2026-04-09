/**
 * MAIN ACCOUNT SYSTEM — Supabase Auth (email/password)
 *
 * Completely isolated from the secret/private system (AuthContext).
 * Uses: supabase.auth, user_profiles table, user_progress table
 * Storage: puzzlecraft-* localStorage keys
 * Routes: all public routes + /account
 *
 * FIXES:
 *  1. signUp() no longer passes emailRedirectTo — email confirmation
 *     is disabled at the Supabase project level.
 *  2. handleSession() now handles "SIGNED_UP" event the same as "SIGNED_IN"
 *     so new users are immediately logged in and routed to the app.
 *  3. fetchProfile() reads BOTH is_premium AND subscribed columns so
 *     admin-granted Plus (which may write to either column) always resolves.
 *  4. refreshSubscription() fires automatically after account is set,
 *     so admin-granted Plus is detected on first load — no manual refresh.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface UserAccount {
  id: string;
  email: string;
  displayName: string | null;
  isPremium: boolean;
  isAdmin: boolean;
}

interface UserAccountContextType {
  account: UserAccount | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  pendingMerge: boolean;
  resolveMerge: (strategy: "merge" | "keep-account") => Promise<void>;
  subscribed: boolean;
  subscriptionEnd: string | null;
  checkingSubscription: boolean;
  refreshSubscription: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const UserAccountContext = createContext<UserAccountContextType | null>(null);

const COMPLETIONS_KEY   = "puzzlecraft-completions";
const SOLVES_KEY        = "puzzlecraft-solves";
const ENDLESS_KEY       = "puzzlecraft_endless_sessions";
const DAILY_KEY         = "puzzlecraft-daily-completions";
const MERGE_HANDLED_KEY = "puzzlecraft-merge-handled";

function hasLocalData(): boolean {
  try {
    const c = localStorage.getItem(COMPLETIONS_KEY);
    const s = localStorage.getItem(SOLVES_KEY);
    return (!!c && c !== "[]") || (!!s && s !== "[]");
  } catch { return false; }
}

function getLocalBlob(key: string, fallback: any = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

/**
 * FIX: Read both is_premium AND subscribed.
 * manage-premium-emails edge fn may write to is_premium.
 * Stripe webhook writes to subscribed.
 * Either being true = has Plus.
 */
async function fetchProfile(userId: string): Promise<UserAccount | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("display_name, is_premium, subscribed, is_admin")
    .eq("id", userId)
    .single();
  if (!data) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return {
    id:          userId,
    email:       user?.email || "",
    displayName: (data as any).display_name,
    isPremium:   !!((data as any).is_premium || (data as any).subscribed),
    isAdmin:     !!((data as any).is_admin),
  };
}

async function pushProgressToDb(userId: string) {
  await supabase.from("user_progress").upsert({
    user_id:      userId,
    completions:  getLocalBlob(COMPLETIONS_KEY, []),
    solves:       getLocalBlob(SOLVES_KEY, []),
    endless_data: getLocalBlob(ENDLESS_KEY, []),
    daily_data:   getLocalBlob(DAILY_KEY, {}),
    updated_at:   new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function pullProgressFromDb(userId: string) {
  const { data } = await supabase
    .from("user_progress")
    .select("completions, solves, endless_data, daily_data")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  if (Array.isArray(data.completions)   && data.completions.length   > 0)
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(data.completions));
  if (Array.isArray(data.solves)        && data.solves.length        > 0)
    localStorage.setItem(SOLVES_KEY, JSON.stringify(data.solves));
  if (Array.isArray(data.endless_data)  && data.endless_data.length  > 0)
    localStorage.setItem(ENDLESS_KEY, JSON.stringify(data.endless_data));
  if (data.daily_data && typeof data.daily_data === "object" && Object.keys(data.daily_data).length > 0)
    localStorage.setItem(DAILY_KEY, JSON.stringify(data.daily_data));
}

async function mergeProgressToDb(userId: string) {
  const { data: remote } = await supabase
    .from("user_progress")
    .select("completions, solves, endless_data, daily_data")
    .eq("user_id", userId)
    .single();

  const localCompletions = getLocalBlob(COMPLETIONS_KEY, []);
  const localSolves      = getLocalBlob(SOLVES_KEY, []);
  const localEndless     = getLocalBlob(ENDLESS_KEY, []);
  const localDaily       = getLocalBlob(DAILY_KEY, {});

  const remoteCompletions = Array.isArray(remote?.completions)  ? remote.completions  : [];
  const remoteSolves      = Array.isArray(remote?.solves)       ? remote.solves       : [];
  const remoteEndless     = Array.isArray(remote?.endless_data) ? remote.endless_data : [];
  const remoteDaily       = (remote?.daily_data && typeof remote.daily_data === "object") ? remote.daily_data : {};

  const mergedCompletions = dedupeByKey([...remoteCompletions, ...localCompletions], "date");
  const mergedSolves      = dedupeByKey([...remoteSolves, ...localSolves], "id");
  const mergedEndless     = dedupeByKey([...remoteEndless, ...localEndless], "id");
  const mergedDaily       = { ...remoteDaily as Record<string, unknown>, ...localDaily };

  await supabase.from("user_progress").upsert({
    user_id:      userId,
    completions:  mergedCompletions,
    solves:       mergedSolves,
    endless_data: mergedEndless,
    daily_data:   mergedDaily,
    updated_at:   new Date().toISOString(),
  }, { onConflict: "user_id" });

  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(mergedCompletions));
  localStorage.setItem(SOLVES_KEY,      JSON.stringify(mergedSolves));
  localStorage.setItem(ENDLESS_KEY,     JSON.stringify(mergedEndless));
  localStorage.setItem(DAILY_KEY,       JSON.stringify(mergedDaily));
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
  const [account,      setAccount]      = useState<UserAccount | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [pendingMerge, setPendingMerge] = useState(false);
  const [pendingUserId,setPendingUserId]= useState<string | null>(null);
  const [subscribed,   setSubscribed]   = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const refreshSubscription = useCallback(async () => {
    try {
      setCheckingSubscription(true);
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        setSubscribed(!!data.subscribed);
        setSubscriptionEnd(data.subscription_end ?? null);
      }
    } catch {}
    finally { setCheckingSubscription(false); }
  }, []);

  /**
   * FIX: Handle SIGNED_UP exactly like SIGNED_IN.
   * With email confirmation disabled, SIGNED_UP fires with a live session.
   */
  const handleSession = useCallback(async (session: Session | null, event?: string) => {
    if (!session?.user) {
      setAccount(null);
      setSubscribed(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    const profile = await fetchProfile(session.user.id);
    setAccount(profile);

    const mergeKey       = `${MERGE_HANDLED_KEY}-${session.user.id}`;
    const alreadyHandled = localStorage.getItem(mergeKey) === "1";
    const isFreshAuth    = event === "SIGNED_IN" || event === "SIGNED_UP";

    if (!alreadyHandled && isFreshAuth && hasLocalData()) {
      setPendingMerge(true);
      setPendingUserId(session.user.id);
    } else if (!alreadyHandled && !hasLocalData()) {
      await pullProgressFromDb(session.user.id);
      localStorage.setItem(mergeKey, "1");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => { handleSession(session, event); }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, "INITIAL_SESSION");
    });
    return () => subscription.unsubscribe();
  }, [handleSession]);

  // Check subscription when account loads and periodically
  useEffect(() => {
    if (!account) return;
    refreshSubscription();
    const id = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(id);
  }, [account, refreshSubscription]);

  // Sync progress to DB periodically for logged-in users
  useEffect(() => {
    if (!account) return;
    const id = setInterval(() => pushProgressToDb(account.id), 60_000);
    return () => clearInterval(id);
  }, [account]);

  /**
   * FIX: No emailRedirectTo. No email confirmation.
   */
  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signIn = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (account) await pushProgressToDb(account.id);
    await supabase.auth.signOut();
    setAccount(null);
    setSubscribed(false);
    setSubscriptionEnd(null);
  }, [account]);

  const resolveMerge = useCallback(async (strategy: "merge" | "keep-account") => {
    if (!pendingUserId) return;
    if (strategy === "merge") await mergeProgressToDb(pendingUserId);
    else await pullProgressFromDb(pendingUserId);
    localStorage.setItem(`${MERGE_HANDLED_KEY}-${pendingUserId}`, "1");
    setPendingMerge(false);
    setPendingUserId(null);
  }, [pendingUserId]);

  const startCheckout = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) { console.error("Checkout error:", e); }
  }, []);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) { console.error("Portal error:", e); }
  }, []);

  const refreshAccount = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setAccount(profile);
    }
    await refreshSubscription();
  }, [refreshSubscription]);

  return (
    <UserAccountContext.Provider value={{
      account, loading, signUp, signIn, signOut,
      pendingMerge, resolveMerge,
      subscribed, subscriptionEnd, checkingSubscription, refreshSubscription,
      refreshAccount, startCheckout, openCustomerPortal,
    }}>
      {children}
    </UserAccountContext.Provider>
  );
}

export function useUserAccount() {
  const ctx = useContext(UserAccountContext);
  if (!ctx) throw new Error("useUserAccount must be used within UserAccountProvider");
  return ctx;
}
