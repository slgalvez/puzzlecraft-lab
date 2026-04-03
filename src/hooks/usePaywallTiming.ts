/**
 * usePaywallTiming.ts
 * Fires the upgrade modal at emotionally resonant moments —
 * when the user has just experienced value, not before.
 */

import { useState, useEffect, useCallback } from "react";
import { usePremiumAccess } from "@/lib/premiumAccess";
import { getDailyStreak } from "@/lib/dailyChallenge";
import { getSolveRecords } from "@/lib/solveTracker";

const PAYWALL_SHOWN_KEY    = "puzzlecraft_paywall_shown_at";
const PAYWALL_MIN_INTERVAL = 48 * 60 * 60 * 1000; // 48 hours

type PaywallTrigger =
  | "streak_7"
  | "friend_solved"
  | "hard_complete"
  | "first_milestone"
  | "streak_at_risk";

interface UsePaywallTimingReturn {
  shouldShow: boolean;
  trigger: PaywallTrigger | null;
  dismiss: () => void;
  checkAfterSolve: (difficulty: string) => void;
  checkAfterMilestone: () => void;
  checkAfterFriendSolved: () => void;
}

function wasShownRecently(): boolean {
  try {
    const lastShown = localStorage.getItem(PAYWALL_SHOWN_KEY);
    if (!lastShown) return false;
    return Date.now() - Number(lastShown) < PAYWALL_MIN_INTERVAL;
  } catch { return false; }
}

function markShown() {
  try { localStorage.setItem(PAYWALL_SHOWN_KEY, String(Date.now())); }
  catch {}
}

export function usePaywallTiming(): UsePaywallTimingReturn {
  const { isPremium, showUpgradeCTA } = usePremiumAccess();
  const [shouldShow, setShouldShow] = useState(false);
  const [trigger, setTrigger] = useState<PaywallTrigger | null>(null);

  const maybeShow = useCallback((t: PaywallTrigger) => {
    if (isPremium || !showUpgradeCTA) return;
    if (wasShownRecently()) return;
    markShown();
    setTrigger(t);
    setShouldShow(true);
  }, [isPremium, showUpgradeCTA]);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    setTrigger(null);
  }, []);

  // Streak at risk — runs on mount, checks every minute
  useEffect(() => {
    const check = () => {
      const streak = getDailyStreak();
      // If streak >= 5 and today isn't completed, they're at risk
      const today = new Date().toISOString().slice(0, 10);
      const completions = JSON.parse(localStorage.getItem("puzzlecraft-daily-completions") || "{}");
      const playedToday = !!completions[today];
      if (streak.current >= 5 && !playedToday) {
        maybeShow("streak_at_risk");
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [maybeShow]);

  // 7-day streak trigger
  useEffect(() => {
    const streak = getDailyStreak();
    if (streak.current === 7 || streak.current === 14 || streak.current === 30) {
      setTimeout(() => maybeShow("streak_7"), 1500);
    }
  }, [maybeShow]);

  const checkAfterSolve = useCallback((difficulty: string) => {
    if (difficulty === "hard") {
      setTimeout(() => maybeShow("hard_complete"), 3000);
    }
  }, [maybeShow]);

  const checkAfterMilestone = useCallback(() => {
    const records = getSolveRecords();
    const isFirstMilestone = records.length === 10;
    if (isFirstMilestone) {
      setTimeout(() => maybeShow("first_milestone"), 2500);
    }
  }, [maybeShow]);

  const checkAfterFriendSolved = useCallback(() => {
    setTimeout(() => maybeShow("friend_solved"), 1000);
  }, [maybeShow]);

  return {
    shouldShow,
    trigger,
    dismiss,
    checkAfterSolve,
    checkAfterMilestone,
    checkAfterFriendSolved,
  };
}
