/**
 * premiumAccess.ts
 * src/lib/premiumAccess.ts
 *
 * SUBSCRIPTION GATING — STRICT MODE
 *
 * hasPremiumAccess() grants access ONLY when:
 *   1. The server-side check-subscription edge function returned true, AND
 *   2. The subscription has not expired
 *
 * Source of truth: UserAccountContext.subscribed
 *   - Set by check-subscription edge function (server-validated)
 *   - Refreshed on mount + every 60 seconds
 *   - Resets to false immediately on signout
 *   - Cannot be spoofed via localStorage or dev tools
 *
 * Safe defaults during loading:
 *   - isPremium = false while checkingSubscription = true
 *   - No premium content renders until the server check resolves
 *
 * Admin bypass:
 *   - isAdmin = true always grants access (for testing/support)
 *   - Admins are set server-side in user_profiles.is_admin
 */

import { useUserAccount } from "@/contexts/UserAccountContext";

// ─── Launch flag ──────────────────────────────────────────────────────────────
export const PUZZLECRAFT_PLUS_LAUNCHED = true;

// ─── Free tier limits ─────────────────────────────────────────────────────────
export const FREE_CRAFT_LIMIT_PER_MONTH = 10;
export const FREE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const PLUS_DIFFICULTIES = ["easy", "medium", "hard", "extreme", "insane"] as const;

export type Difficulty = (typeof PLUS_DIFFICULTIES)[number];
export type FreeDifficulty = (typeof FREE_DIFFICULTIES)[number];

// ─── Core access check (pure function — no hooks) ─────────────────────────────

export function hasPremiumAccess(
  subscribed: boolean,
  isAdmin: boolean,
  loading: boolean = false
): boolean {
  if (loading) return false;
  if (isAdmin) return true;
  if (!PUZZLECRAFT_PLUS_LAUNCHED) return false;
  return subscribed;
}

export function shouldShowUpgradeCTA(
  subscribed: boolean,
  isAdmin: boolean,
  loading: boolean
): boolean {
  if (loading) return false;
  if (isAdmin) return false;
  return !subscribed;
}

// ─── Difficulty gating ────────────────────────────────────────────────────────

export function isDifficultyLocked(
  difficulty: Difficulty,
  isPremium: boolean
): boolean {
  if (isPremium) return false;
  return !FREE_DIFFICULTIES.includes(difficulty as FreeDifficulty);
}

export function getAvailableDifficulties(isPremium: boolean): readonly Difficulty[] {
  return isPremium ? PLUS_DIFFICULTIES : FREE_DIFFICULTIES;
}

// ─── Craft puzzle limit ───────────────────────────────────────────────────────
const CRAFT_STORAGE_KEY = "puzzlecraft_craft_sent";

interface CraftSentRecord { id: string; sentAt: string; }

function getCraftSentRecords(): CraftSentRecord[] {
  try {
    const raw = localStorage.getItem(CRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CraftSentRecord[]) : [];
  } catch { return []; }
}

export function getCraftSentThisMonth(): number {
  const now = new Date();
  return getCraftSentRecords().filter((r) => {
    const d = new Date(r.sentAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

export function recordCraftSent(id: string): void {
  const records = getCraftSentRecords();
  records.push({ id, sentAt: new Date().toISOString() });
  try { localStorage.setItem(CRAFT_STORAGE_KEY, JSON.stringify(records)); } catch {}
}

export function isCraftLimitReached(isPremium: boolean): boolean {
  if (isPremium) return false;
  return getCraftSentThisMonth() >= FREE_CRAFT_LIMIT_PER_MONTH;
}

export interface CraftLimitStatus {
  isPremium: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  isAtLimit: boolean;
  isNearLimit: boolean;
  resetDate: string | null;
}

export function getCraftLimitStatus(isPremium: boolean): CraftLimitStatus {
  if (isPremium) {
    return { isPremium: true, used: getCraftSentThisMonth(), limit: null, remaining: null, isAtLimit: false, isNearLimit: false, resetDate: null };
  }
  const used = getCraftSentThisMonth();
  const limit = FREE_CRAFT_LIMIT_PER_MONTH;
  const remaining = Math.max(0, limit - used);
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return { isPremium: false, used, limit, remaining, isAtLimit: used >= limit, isNearLimit: remaining === 1, resetDate };
}

// ─── Endless mode ─────────────────────────────────────────────────────────────
export const ENDLESS_REQUIRES_PLUS = false;
export const FREE_ENDLESS_SESSION_CAP = 10;

export function isEndlessLocked(isPremium: boolean): boolean {
  if (!ENDLESS_REQUIRES_PLUS) return false;
  return !isPremium;
}

export function getEndlessSessionCap(isPremium: boolean): number | null {
  if (isPremium) return null;
  if (ENDLESS_REQUIRES_PLUS) return 0;
  return FREE_ENDLESS_SESSION_CAP;
}

// ─── Stats gating ─────────────────────────────────────────────────────────────
export function canSeeFullStats(isPremium: boolean): boolean {
  return isPremium;
}

// ─── React hook ───────────────────────────────────────────────────────────────

export interface PremiumAccessState {
  isPremium: boolean;
  loading: boolean;
  showUpgradeCTA: boolean;
  craftStatus: CraftLimitStatus;
  availableDifficulties: readonly Difficulty[];
  isDiffLocked: (d: Difficulty) => boolean;
  isEndlessLocked: boolean;
  endlessSessionCap: number | null;
  canSeeFullStats: boolean;
  recordCraftSent: (id: string) => void;
  subscriptionEnd: string | null;
}

export function usePremiumAccess(): PremiumAccessState {
  const {
    account,
    subscribed,
    subscriptionEnd,
    checkingSubscription,
    loading: accountLoading,
  } = useUserAccount();

  const loading = accountLoading || checkingSubscription;
  const isAdmin = account?.isAdmin ?? false;
  const isPremium = hasPremiumAccess(subscribed, isAdmin, loading);
  const showUpgradeCTA = shouldShowUpgradeCTA(subscribed, isAdmin, loading);
  const craftStatus = getCraftLimitStatus(isPremium);

  return {
    isPremium,
    loading,
    showUpgradeCTA,
    craftStatus,
    availableDifficulties: getAvailableDifficulties(isPremium),
    isDiffLocked: (d: Difficulty) => isDifficultyLocked(d, isPremium),
    isEndlessLocked: isEndlessLocked(isPremium),
    endlessSessionCap: getEndlessSessionCap(isPremium),
    canSeeFullStats: canSeeFullStats(isPremium),
    recordCraftSent,
    subscriptionEnd,
  };
}
