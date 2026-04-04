/**
 * useStreakShield.ts
 * src/hooks/useStreakShield.ts
 *
 * Streak Shield: a consumable that preserves a user's streak when they
 * miss a day.
 *
 * Rules:
 *  - Plus subscribers: 1 shield auto-granted per calendar month
 *  - Free users: can earn 1 shield by solving 7 puzzles in a week
 *  - Shield activates automatically when the streak would have broken
 *  - Shield is consumed — gone after one use until the next grant
 */

import { useState, useEffect, useCallback } from "react";
import { usePremiumAccess } from "@/lib/premiumAccess";

// ── Storage keys ──────────────────────────────────────────────────────────
const SHIELD_COUNT_KEY   = "puzzlecraft_shield_count";
const SHIELD_GRANTED_KEY = "puzzlecraft_shield_granted_month"; // "2026-04"
const SHIELD_USED_KEY    = "puzzlecraft_shield_used_dates";    // JSON array of "YYYY-MM-DD"

// ── Helpers ───────────────────────────────────────────────────────────────

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getShieldCount(): number {
  try { return parseInt(localStorage.getItem(SHIELD_COUNT_KEY) ?? "0", 10) || 0; }
  catch { return 0; }
}

export function setShieldCount(n: number) {
  try { localStorage.setItem(SHIELD_COUNT_KEY, String(Math.max(0, n))); }
  catch {}
}

export function getShieldUsedDates(): string[] {
  try {
    const raw = localStorage.getItem(SHIELD_USED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function wasShieldUsedYesterday(): boolean {
  return getShieldUsedDates().includes(yesterdayKey());
}

export function recordShieldUse() {
  const dates = getShieldUsedDates();
  dates.push(todayKey());
  try { localStorage.setItem(SHIELD_USED_KEY, JSON.stringify(dates.slice(-30))); }
  catch {}
}

export function recordShieldUseFor(dateStr: string) {
  const dates = getShieldUsedDates();
  if (!dates.includes(dateStr)) {
    dates.push(dateStr);
    try { localStorage.setItem(SHIELD_USED_KEY, JSON.stringify(dates.slice(-30))); }
    catch {}
  }
}

// ── Monthly grant ─────────────────────────────────────────────────────────

function maybeGrantMonthlyShield(isPremium: boolean) {
  if (!isPremium) return;
  const month = currentMonthKey();
  try {
    const grantedMonth = localStorage.getItem(SHIELD_GRANTED_KEY);
    if (grantedMonth === month) return;
    const current = getShieldCount();
    setShieldCount(current + 1);
    localStorage.setItem(SHIELD_GRANTED_KEY, month);
  } catch {}
}

// ── Main hook ─────────────────────────────────────────────────────────────

export interface StreakShieldState {
  shieldCount: number;
  hasShield: boolean;
  shieldAutoUsedLastNight: boolean;
  useShield: () => void;
  dismissShieldNotification: () => void;
}

export function useStreakShield(): StreakShieldState {
  const { account } = useUserAccount();
  const isPremium = hasPremiumAccess(account);

  const [shieldCount, setShieldCountState] = useState(getShieldCount);
  const [shieldAutoUsedLastNight, setShieldAutoUsedLastNight] = useState(false);

  useEffect(() => {
    maybeGrantMonthlyShield(isPremium);
    setShieldCountState(getShieldCount());

    if (wasShieldUsedYesterday()) {
      setShieldAutoUsedLastNight(true);
    }
  }, [isPremium]);

  const useShield = useCallback(() => {
    const current = getShieldCount();
    if (current <= 0) return;
    setShieldCount(current - 1);
    setShieldCountState(current - 1);
    recordShieldUse();
  }, []);

  const dismissShieldNotification = useCallback(() => {
    setShieldAutoUsedLastNight(false);
  }, []);

  return {
    shieldCount,
    hasShield: shieldCount > 0,
    shieldAutoUsedLastNight,
    useShield,
    dismissShieldNotification,
  };
}

// ── Free user shield earning — 7 consecutive days ─────────────────────────

export function checkFreeShieldEarn(): boolean {
  try {
    const { getSolveRecords } = require("@/lib/solveTracker");
    const records = getSolveRecords();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const playedDays = new Set(
      records
        .filter((r: { completedAt: string }) => new Date(r.completedAt).getTime() >= sevenDaysAgo.getTime())
        .map((r: { completedAt: string }) => r.completedAt.slice(0, 10))
    );

    if (playedDays.size >= 7) {
      const EARN_KEY = "puzzlecraft_shield_earned_week";
      const weekKey = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}`;
      const alreadyEarned = localStorage.getItem(EARN_KEY) === weekKey;
      if (!alreadyEarned) {
        setShieldCount(getShieldCount() + 1);
        localStorage.setItem(EARN_KEY, weekKey);
        return true;
      }
    }
  } catch {}
  return false;
}
