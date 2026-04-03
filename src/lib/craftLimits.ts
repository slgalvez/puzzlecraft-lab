/**
 * Craft puzzle sending limits
 *
 * Free users: 5 craft puzzles per calendar month
 * Puzzlecraft+ users: unlimited
 *
 * The count is derived from the existing localStorage sent items
 * (loadSentItems from craftHistory) filtered to the current calendar month.
 * No new storage key needed — we reuse what already exists.
 */

import { loadSentItems } from "@/lib/craftHistory";

export const FREE_MONTHLY_CRAFT_LIMIT = 5;

/**
 * Returns how many craft puzzles the user has sent in the current
 * calendar month (based on sentAt timestamp).
 */
export function getCraftSentThisMonth(): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return loadSentItems().filter((item) => item.sentAt >= monthStart).length;
}

/**
 * Returns true if the user has reached or exceeded the free monthly limit.
 * Always returns false for premium users.
 */
export function isCraftLimitReached(isPremium: boolean): boolean {
  if (isPremium) return false;
  return getCraftSentThisMonth() >= FREE_MONTHLY_CRAFT_LIMIT;
}

/**
 * Returns how many craft puzzles the free user has left this month.
 * Returns null for premium users (unlimited).
 */
export function getCraftRemainingThisMonth(isPremium: boolean): number | null {
  if (isPremium) return null;
  const used = getCraftSentThisMonth();
  return Math.max(0, FREE_MONTHLY_CRAFT_LIMIT - used);
}

/**
 * Returns a human-readable status string for display in the UI.
 * e.g. "3 of 5 free puzzles used this month"
 */
export function getCraftLimitStatus(isPremium: boolean): {
  used: number;
  limit: number | null;
  remaining: number | null;
  atLimit: boolean;
  label: string;
} {
  if (isPremium) {
    return {
      used: getCraftSentThisMonth(),
      limit: null,
      remaining: null,
      atLimit: false,
      label: "Unlimited",
    };
  }

  const used = getCraftSentThisMonth();
  const remaining = Math.max(0, FREE_MONTHLY_CRAFT_LIMIT - used);
  const atLimit = used >= FREE_MONTHLY_CRAFT_LIMIT;

  return {
    used,
    limit: FREE_MONTHLY_CRAFT_LIMIT,
    remaining,
    atLimit,
    label: atLimit
      ? `${FREE_MONTHLY_CRAFT_LIMIT}/${FREE_MONTHLY_CRAFT_LIMIT} used this month`
      : `${used}/${FREE_MONTHLY_CRAFT_LIMIT} used this month`,
  };
}
