import { useState, useEffect, useRef, useCallback } from "react";
import { recordCompletion } from "@/lib/progressTracker";
import { recordDailyCompletion, getTodaysChallenge } from "@/lib/dailyChallenge";
import { recordSolve, getSolveRecords, type TierUpEvent } from "@/lib/solveTracker";
import { checkMilestones } from "@/lib/milestones";
import { computePlayerRating, getSkillTier } from "@/lib/solveScoring";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface TimerState {
  elapsed: number;
  isRunning: boolean;
  isSolved: boolean;
  countdown: number; // pre-start countdown (5,4,3,2,1)
  expired: boolean; // true if time limit reached
}

interface BestTime {
  time: number;
  date: string;
}

const BEST_TIMES_KEY = "puzzlecraft-best-times";
const COUNTDOWN_SECONDS = 5;

function getBestTimes(): Record<string, BestTime> {
  try {
    return JSON.parse(localStorage.getItem(BEST_TIMES_KEY) || "{}");
  } catch {
    return {};
  }
}

function categoryKey(category?: string, difficulty?: string): string | null {
  if (!category || !difficulty) return null;
  return `${category}-${difficulty}`;
}

function saveBestTime(puzzleKey: string, time: number, category?: string, difficulty?: string) {
  const times = getBestTimes();
  const key = categoryKey(category, difficulty) || puzzleKey;
  const existing = times[key];
  if (!existing || time < existing.time) {
    times[key] = { time, date: new Date().toISOString() };
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times));
    return true;
  }
  return false;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TimerOptions {
  category?: PuzzleCategory;
  difficulty?: string;
  initialElapsed?: number;
  /** Time limit in seconds. When set, timer counts down from this value. */
  timeLimit?: number;
}

export function usePuzzleTimer(puzzleKey: string, options?: TimerOptions) {
  const initialElapsed = options?.initialElapsed ?? 0;
  const timeLimit = options?.timeLimit;
  const skipCountdown = initialElapsed > 0;

  const [state, setState] = useState<TimerState>({
    elapsed: initialElapsed,
    isRunning: false,
    isSolved: false,
    countdown: skipCountdown ? 0 : COUNTDOWN_SECONDS,
    expired: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const catKey = categoryKey(options?.category, options?.difficulty);
  const bestTime = getBestTimes()[catKey || puzzleKey]?.time ?? null;

  // Reset on puzzle change
  useEffect(() => {
    const resume = (options?.initialElapsed ?? 0) > 0;
    setState({
      elapsed: options?.initialElapsed ?? 0,
      isRunning: resume,
      isSolved: false,
      countdown: resume ? 0 : COUNTDOWN_SECONDS,
      expired: false,
    });
  }, [puzzleKey]);

  // Countdown tick
  useEffect(() => {
    if (state.countdown <= 0 || state.isSolved) return;
    const id = setInterval(() => {
      setState((s) => {
        if (s.countdown <= 1) {
          return { ...s, countdown: 0, isRunning: true };
        }
        return { ...s, countdown: s.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.countdown > 0, state.isSolved, puzzleKey]);

  // Main timer tick
  useEffect(() => {
    if (state.isRunning && !state.isSolved && state.countdown === 0 && !state.expired) {
      intervalRef.current = setInterval(() => {
        setState((s) => {
          const next = s.elapsed + 1;
          // Check time limit expiry
          if (timeLimit && next >= timeLimit) {
            return { ...s, elapsed: timeLimit, isRunning: false, expired: true };
          }
          return { ...s, elapsed: next };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.isSolved, state.countdown, state.expired, puzzleKey, timeLimit]);

  const pause = useCallback(() => setState((s) => ({ ...s, isRunning: false })), []);
  const resume = useCallback(() => setState((s) => (s.isSolved || s.countdown > 0 || s.expired ? s : { ...s, isRunning: true })), []);

  const solve = useCallback((opts?: { assisted?: boolean; hintsUsed?: number; mistakesCount?: number }) => {
    setState((s) => ({ ...s, isRunning: false, isSolved: true, countdown: 0 }));
    const assisted = opts?.assisted ?? false;
    const hintsUsed = opts?.hintsUsed ?? 0;
    const mistakesCount = opts?.mistakesCount ?? 0;
    const isNew = assisted ? false : saveBestTime(puzzleKey, state.elapsed, options?.category, options?.difficulty);

    const isDailyChallenge = puzzleKey.startsWith("daily-");

    if (options?.category && options?.difficulty) {
      recordCompletion(puzzleKey, options.category, options.difficulty, state.elapsed, assisted);
      if (isDailyChallenge) {
        const challenge = getTodaysChallenge();
        if (puzzleKey === `daily-${challenge.dateStr}-${challenge.category}-${challenge.difficulty}`) {
          recordDailyCompletion(challenge.dateStr, state.elapsed, challenge.category, challenge.difficulty);
        }
      }

      // Snapshot tier BEFORE recording
      const recordsBefore = getSolveRecords();
      const ratingBefore = recordsBefore.length > 0 ? computePlayerRating(recordsBefore) : 0;
      const tierBefore = recordsBefore.length > 0 ? getSkillTier(ratingBefore) : null;

      // Standardized solve record
      recordSolve({
        puzzleId: puzzleKey,
        puzzleType: options.category,
        difficulty: options.difficulty as import("@/lib/puzzleTypes").Difficulty,
        solveTime: state.elapsed,
        mistakesCount,
        hintsUsed,
        isDailyChallenge,
        assisted,
        origin: isDailyChallenge ? "daily" : undefined,
      });

      // Detect tier-up AFTER recording
      if (tierBefore) {
        const recordsAfter = getSolveRecords();
        const ratingAfter = computePlayerRating(recordsAfter);
        const tierAfter = getSkillTier(ratingAfter);
        if (tierAfter !== tierBefore) {
          const event: TierUpEvent = {
            fromTier: tierBefore,
            toTier: tierAfter,
            rating: ratingAfter,
            timestamp: new Date().toISOString(),
          };
          try {
            localStorage.setItem("puzzlecraft-tier-up", JSON.stringify(event));
          } catch {}
        }
      }

      // Check milestones after recording
      setTimeout(() => checkMilestones(), 1500);
    }
    return { time: state.elapsed, isNewBest: isNew };
  }, [puzzleKey, state.elapsed, options?.category, options?.difficulty]);

  const reset = useCallback(() => {
    setState({ elapsed: 0, isRunning: false, isSolved: false, countdown: COUNTDOWN_SECONDS, expired: false });
  }, []);

  // Remaining time for countdown display
  const remaining = timeLimit ? Math.max(0, timeLimit - state.elapsed) : null;

  return {
    elapsed: state.elapsed,
    isRunning: state.isRunning,
    isSolved: state.isSolved,
    countdown: state.countdown,
    expired: state.expired,
    remaining,
    timeLimit: timeLimit ?? null,
    bestTime,
    pause,
    resume,
    solve,
    reset,
  };
}
