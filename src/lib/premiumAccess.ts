/**
 * premiumAccess.ts
 * src/lib/premiumAccess.ts
 *
 * Single source of truth for ALL Puzzlecraft+ feature gating.
 * ─────────────────────────────────────────────────────────────
 * Flip PUZZLECRAFT_PLUS_LAUNCHED = true when you're ready to
 * take subscriptions. Everything gates automatically from there.
 */

import { useUserAccount } from "@/contexts/UserAccountContext";

// ─── Launch flag ──────────────────────────────────────────────────────────────
export const PUZZLECRAFT_PLUS_LAUNCHED = false;

// ─── Free tier limits ────────────────────────────────────────────────────────
export const FREE_CRAFT_LIMIT_PER_MONTH = 10;
export const FREE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const PLUS_DIFFICULTIES = ["easy", "medium", "hard", "extreme", "insane"] as const;

export type Difficulty = (typeof PLUS_DIFFICULTIES)[number];
export type FreeDifficulty = (typeof FREE_DIFFICULTIES)[number];

// ─── Core access check ───────────────────────────────────────────────────────
/**
 * Returns true if the user has active Puzzlecraft+ access.
 * Admins always pass. If the feature hasn't launched, everyone passes.
 */
export function hasPremiumAccess(account: {
  subscribed?: boolean;
  isAdmin?: boolean;
} | null): boolean {
  if (!PUZZLECRAFT_PLUS_LAUNCHED) return !!account; // pre-launch: signed-in users get full access
  if (!account) return false;
  return !!(account.isAdmin || account.subscribed);
}

/**
 * Returns true if the upgrade CTA should be shown to this user.
 * Only shows when launched AND user is not premium.
 */
export function shouldShowUpgradeCTA(account: {
  subscribed?: boolean;
  isAdmin?: boolean;
} | null): boolean {
  if (!PUZZLECRAFT_PLUS_LAUNCHED) return false;
  return !hasPremiumAccess(account);
}

// ─── Difficulty gating ───────────────────────────────────────────────────────
/**
 * Returns true if the given difficulty is locked for free users.
 */
export function isDifficultyLocked(
  difficulty: Difficulty,
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): boolean {
  if (hasPremiumAccess(account)) return false;
  return !FREE_DIFFICULTIES.includes(difficulty as FreeDifficulty);
}

/**
 * Returns the difficulties available to the given user.
 * Free: easy / medium / hard. Plus: all 5.
 */
export function getAvailableDifficulties(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): readonly Difficulty[] {
  if (hasPremiumAccess(account)) return PLUS_DIFFICULTIES;
  return FREE_DIFFICULTIES;
}

// ─── Craft puzzle limit ───────────────────────────────────────────────────────
const CRAFT_STORAGE_KEY = "puzzlecraft_craft_sent";

interface CraftSentRecord {
  id: string;
  sentAt: string; // ISO string
}

function getCraftSentRecords(): CraftSentRecord[] {
  try {
    const raw = localStorage.getItem(CRAFT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CraftSentRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Returns the number of craft puzzles sent in the current calendar month.
 */
export function getCraftSentThisMonth(): number {
  const now = new Date();
  const records = getCraftSentRecords();
  return records.filter((r) => {
    const d = new Date(r.sentAt);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }).length;
}

/**
 * Records a craft send event (call after a successful share/send).
 */
export function recordCraftSent(id: string): void {
  const records = getCraftSentRecords();
  records.push({ id, sentAt: new Date().toISOString() });
  try {
    localStorage.setItem(CRAFT_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/**
 * Returns true if the free user has hit their monthly craft limit.
 */
export function isCraftLimitReached(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): boolean {
  if (hasPremiumAccess(account)) return false;
  return getCraftSentThisMonth() >= FREE_CRAFT_LIMIT_PER_MONTH;
}

/**
 * How many craft sends remain this month for free users.
 * Returns null for premium users (unlimited).
 */
export function getCraftRemainingThisMonth(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): number | null {
  if (hasPremiumAccess(account)) return null;
  const used = getCraftSentThisMonth();
  return Math.max(0, FREE_CRAFT_LIMIT_PER_MONTH - used);
}

export interface CraftLimitStatus {
  isPremium: boolean;
  used: number;
  limit: number | null;       // null = unlimited
  remaining: number | null;   // null = unlimited
  isAtLimit: boolean;
  isNearLimit: boolean;       // 1 remaining
  resetDate: string | null;   // e.g. "May 1" — null for premium
}

/**
 * Full status object for rendering limit banners / counters.
 */
export function getCraftLimitStatus(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): CraftLimitStatus {
  const isPremium = hasPremiumAccess(account);
  if (isPremium) {
    return {
      isPremium: true,
      used: getCraftSentThisMonth(),
      limit: null,
      remaining: null,
      isAtLimit: false,
      isNearLimit: false,
      resetDate: null,
    };
  }

  const used = getCraftSentThisMonth();
  const limit = FREE_CRAFT_LIMIT_PER_MONTH;
  const remaining = Math.max(0, limit - used);

  const now = new Date();
  const firstNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDate = firstNext.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return {
    isPremium: false,
    used,
    limit,
    remaining,
    isAtLimit: used >= limit,
    isNearLimit: remaining === 1,
    resetDate,
  };
}

// ─── Endless mode gating ─────────────────────────────────────────────────────
/**
 * Returns true if endless mode is locked for this user.
 * Currently: free users can play endless but see a limited session cap.
 * Flip ENDLESS_REQUIRES_PLUS = true to make it fully paywalled.
 */
export const ENDLESS_REQUIRES_PLUS = false;
export const FREE_ENDLESS_SESSION_CAP = 10; // puzzles per session for free users

export function isEndlessLocked(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): boolean {
  if (!ENDLESS_REQUIRES_PLUS) return false;
  return !hasPremiumAccess(account);
}

export function getEndlessSessionCap(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): number | null {
  if (hasPremiumAccess(account)) return null; // unlimited
  if (ENDLESS_REQUIRES_PLUS) return 0;        // locked
  return FREE_ENDLESS_SESSION_CAP;
}

// ─── Stats gating ────────────────────────────────────────────────────────────
/**
 * Returns true if the user can see the full premium analytics section
 * (rating card, milestones, accuracy trends, personal bests, solve history).
 */
export function canSeeFullStats(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): boolean {
  return hasPremiumAccess(account);
}

// ─── React hook ──────────────────────────────────────────────────────────────
/**
 * usePremiumAccess — convenience hook.
 * Returns the full gate surface for use in any component.
 *
 * Usage:
 *   const { isPremium, craftStatus, isDiffLocked, showUpgradeCTA } = usePremiumAccess();
 */
export function usePremiumAccess() {
  const { account, subscribed } = useUserAccount();

  // Build the account shape expected by gate functions
  const gateAccount = account
    ? { isAdmin: account.isAdmin, subscribed }
    : null;

  const isPremium = hasPremiumAccess(gateAccount);
  const showUpgradeCTA = shouldShowUpgradeCTA(gateAccount);
  const craftStatus = getCraftLimitStatus(gateAccount);
  const availableDifficulties = getAvailableDifficulties(gateAccount);

  return {
    loading: false,
    isPremium,
    showUpgradeCTA,
    craftStatus,
    availableDifficulties,
    isDiffLocked: (d: Difficulty) => isDifficultyLocked(d, gateAccount),
    isEndlessLocked: isEndlessLocked(gateAccount),
    endlessSessionCap: getEndlessSessionCap(gateAccount),
    canSeeFullStats: canSeeFullStats(gateAccount),
    recordCraftSent,
  };
}
