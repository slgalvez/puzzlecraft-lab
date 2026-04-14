/**
 * premiumAccess.ts  ← FULL REPLACEMENT
 * src/lib/premiumAccess.ts
 *
 * ═══════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH FOR ALL PUZZLECRAFT+ FEATURE GATING
 * ═══════════════════════════════════════════════════════════════
 *
 * FREE TIER LIMITS (enforced everywhere):
 *   ┌─────────────────────────────────────────────┐
 *   │  Craft puzzles:   10 per month               │
 *   │  Difficulties:    Easy, Medium, Hard only     │
 *   │  Endless cap:     Unlimited (not paywalled)   │
 *   └─────────────────────────────────────────────┘
 *
 * PUZZLECRAFT_PLUS_LAUNCHED = true
 *   → Premium gating is ACTIVE
 *   → Free users see the 10-creation limit
 *   → Extreme/Insane difficulty locked behind subscription
 *   → Rating/advanced stats locked behind subscription
 *
 * To temporarily disable all gating (e.g. for internal testing):
 *   Set PUZZLECRAFT_PLUS_LAUNCHED = false
 *   → All signed-in users get full access
 *   → Limit counters disappear
 *   → Do NOT ship to production with this set to false
 */

import { useUserAccount } from "@/contexts/UserAccountContext";
import { resolveEntitlement, type EntitlementSource, type EntitlementResult } from "@/lib/entitlements";
export type { EntitlementSource, EntitlementResult };

// ─── Launch flag ──────────────────────────────────────────────────────────────

/**
 * PRODUCTION: true  — gating active, free users see 10-creation limit
 * TESTING:    false — all signed-in users get full access (no limit shown)
 */
export const PUZZLECRAFT_PLUS_LAUNCHED = true;

// ─── Free tier limits ─────────────────────────────────────────────────────────

/** Free users get 10 craft puzzle sends per calendar month. */
export const FREE_CRAFT_LIMIT_PER_MONTH = 10;

export const FREE_DIFFICULTIES  = ["easy", "medium", "hard"]                       as const;
export const PLUS_DIFFICULTIES  = ["easy", "medium", "hard", "extreme", "insane"]  as const;

export type Difficulty     = (typeof PLUS_DIFFICULTIES)[number];
export type FreeDifficulty = (typeof FREE_DIFFICULTIES)[number];

// ─── Endless mode ─────────────────────────────────────────────────────────────

/** Set to true to put Endless Mode behind a subscription. */
export const ENDLESS_REQUIRES_PLUS  = false;
export const FREE_ENDLESS_SESSION_CAP = 10; // puzzles per session (only used if ENDLESS_REQUIRES_PLUS = true)

// ─── Core access check ───────────────────────────────────────────────────────

type GateAccount = {
  isAdmin?: boolean;
  subscribed?: boolean;
  subscription_platform?: string | null;
  subscription_expires_at?: string | null;
} | null;

/**
 * Returns true if this account has active Puzzlecraft+ access.
 *
 * Delegates to resolveEntitlement() so the full resolution order
 * (admin flag → admin_grant platform → active Stripe) is respected.
 *
 * When LAUNCHED = false: any signed-in user passes (pre-launch mode).
 * When LAUNCHED = true:  runs through resolveEntitlement().
 */
export function hasPremiumAccess(account: GateAccount): boolean {
  if (!PUZZLECRAFT_PLUS_LAUNCHED) return !!account; // pre-launch: signed-in = full access
  if (!account)                   return false;
  return resolveEntitlement({
    subscribed: !!account.subscribed,
    subscription_platform: account.subscription_platform ?? null,
    subscription_expires_at: account.subscription_expires_at ?? null,
    is_admin: !!account.isAdmin,
  }).hasPlus;
}

/**
 * Returns true if the upgrade CTA should be shown.
 * Only fires when launched AND user is not premium.
 */
export function shouldShowUpgradeCTA(account: GateAccount): boolean {
  if (!PUZZLECRAFT_PLUS_LAUNCHED) return false;
  return !hasPremiumAccess(account);
}

// ─── Difficulty gating ────────────────────────────────────────────────────────

export function isDifficultyLocked(difficulty: Difficulty, account: GateAccount): boolean {
  if (hasPremiumAccess(account)) return false;
  return !FREE_DIFFICULTIES.includes(difficulty as FreeDifficulty);
}

export function getAvailableDifficulties(account: GateAccount): readonly Difficulty[] {
  return hasPremiumAccess(account) ? PLUS_DIFFICULTIES : FREE_DIFFICULTIES;
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

/** Number of craft puzzles sent in the current calendar month. */
export function getCraftSentThisMonth(): number {
  const now = new Date();
  return getCraftSentRecords().filter((r) => {
    const d = new Date(r.sentAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

/** Call once after a successful share to record against the monthly limit. */
export function recordCraftSent(id: string): void {
  const records = getCraftSentRecords();
  // Don't double-count the same puzzle ID
  if (records.some((r) => r.id === id)) return;
  records.push({ id, sentAt: new Date().toISOString() });
  try { localStorage.setItem(CRAFT_STORAGE_KEY, JSON.stringify(records)); } catch {}
}

export function isCraftLimitReached(account: GateAccount): boolean {
  if (hasPremiumAccess(account)) return false;
  return getCraftSentThisMonth() >= FREE_CRAFT_LIMIT_PER_MONTH;
}

export interface CraftLimitStatus {
  isPremium:    boolean;
  used:         number;
  limit:        number | null;   // null = unlimited (Plus)
  remaining:    number | null;   // null = unlimited (Plus)
  isAtLimit:    boolean;
  isNearLimit:  boolean;         // exactly 1 remaining
  resetDate:    string | null;   // e.g. "May 1" — null for Plus
}

/**
 * Full craft limit status for rendering counters and banners.
 *
 * Free users always see the 10-creation limit when LAUNCHED = true.
 * The limit is per calendar month and resets on the 1st.
 */
export function getCraftLimitStatus(account: GateAccount): CraftLimitStatus {
  const isPremium = hasPremiumAccess(account);

  if (isPremium) {
    return {
      isPremium: true,
      used:      getCraftSentThisMonth(),
      limit:     null,
      remaining: null,
      isAtLimit: false,
      isNearLimit: false,
      resetDate: null,
    };
  }

  const used      = getCraftSentThisMonth();
  const limit     = FREE_CRAFT_LIMIT_PER_MONTH; // always 10
  const remaining = Math.max(0, limit - used);
  const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return {
    isPremium:   false,
    used,
    limit,                            // 10
    remaining,                        // 10 → 0 as puzzles are sent
    isAtLimit:   used >= limit,
    isNearLimit: remaining === 1,
    resetDate,                        // e.g. "May 1"
  };
}

// ─── Endless mode ─────────────────────────────────────────────────────────────

export function isEndlessLocked(account: GateAccount): boolean {
  if (!ENDLESS_REQUIRES_PLUS) return false;
  return !hasPremiumAccess(account);
}

export function getEndlessSessionCap(account: GateAccount): number | null {
  if (hasPremiumAccess(account))  return null; // unlimited
  if (ENDLESS_REQUIRES_PLUS)       return 0;   // locked
  return FREE_ENDLESS_SESSION_CAP;
}

// ─── Stats gating ────────────────────────────────────────────────────────────

export function canSeeFullStats(account: GateAccount): boolean {
  return hasPremiumAccess(account);
}

// ─── React hook ──────────────────────────────────────────────────────────────

export interface PremiumAccessState {
  /** True only when server has confirmed an active subscription */
  isPremium:            boolean;
  /**
   * True while auth session or subscription check is still loading.
   * Components should not render premium content while this is true.
   */
  loading:              boolean;
  /** True when the upgrade CTA should be shown */
  showUpgradeCTA:       boolean;
  /** Full craft limit status — always reflects the 10-creation limit */
  craftStatus:          CraftLimitStatus;
  /** Difficulty levels available to this user */
  availableDifficulties: readonly Difficulty[];
  /** Whether a specific difficulty is locked for this user */
  isDiffLocked:         (d: Difficulty) => boolean;
  isEndlessLocked:      boolean;
  endlessSessionCap:    number | null;
  canSeeFullStats:      boolean;
  /** Record a craft send against the monthly 10-creation limit */
  recordCraftSent:      (id: string) => void;
  /** ISO string of when the subscription expires — null if no subscription */
  subscriptionEnd:      string | null;
  /** Source of the current entitlement (stripe, admin_grant, or none) */
  entitlementSource:    EntitlementSource;
}

/**
 * usePremiumAccess — convenience hook for components.
 *
 * Returns the full gate surface for any component that needs to check
 * whether the current user has access to a premium feature.
 *
 * Key values:
 *   isPremium      — true if user is subscribed or admin
 *   loading        — true while auth/subscription state is resolving
 *   craftStatus    — contains .limit (10), .used, .remaining, .isAtLimit
 *   isDiffLocked   — function: isDiffLocked("extreme") → true for free users
 *
 * Usage:
 *   const { isPremium, craftStatus, isDiffLocked, loading } = usePremiumAccess();
 */
export function usePremiumAccess(): PremiumAccessState {
  const { account, subscribed, subscriptionEnd, checkingSubscription, loading: accountLoading, entitlementSource } = useUserAccount();

  // Loading = auth session resolving OR server subscription check running
  const loading = !!(accountLoading || checkingSubscription);

  // Build the gate account shape — includes subscription fields for resolveEntitlement()
  const gateAccount: GateAccount = account
    ? { isAdmin: account.isAdmin, subscribed,
        subscription_platform: account.subscription_platform,
        subscription_expires_at: account.subscription_expires_at }
    : null;

  const isPremium      = loading ? false : hasPremiumAccess(gateAccount);
  const showUpgradeCTA = loading ? false : shouldShowUpgradeCTA(gateAccount);
  const craftStatus    = getCraftLimitStatus(loading ? null : gateAccount);

  return {
    loading,
    isPremium,
    showUpgradeCTA,
    craftStatus,
    availableDifficulties: getAvailableDifficulties(loading ? null : gateAccount),
    isDiffLocked:    (d: Difficulty) => isDifficultyLocked(d, loading ? null : gateAccount),
    isEndlessLocked: isEndlessLocked(loading ? null : gateAccount),
    endlessSessionCap: getEndlessSessionCap(loading ? null : gateAccount),
    canSeeFullStats: canSeeFullStats(loading ? null : gateAccount),
    recordCraftSent,
    subscriptionEnd: subscriptionEnd ?? null,
    entitlementSource: (entitlementSource as EntitlementSource) ?? "none",
  };
}
