import { useState, useEffect, useRef, useCallback } from "react";
import { recordCompletion } from "@/lib/progressTracker";
import { recordDailyCompletion, getTodaysChallenge } from "@/lib/dailyChallenge";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface TimerState {
  elapsed: number;
  isRunning: boolean;
  isSolved: boolean;
}

interface BestTime {
  time: number;
  date: string;
}

const BEST_TIMES_KEY = "puzzlecraft-best-times";

function getBestTimes(): Record<string, BestTime> {
  try {
    return JSON.parse(localStorage.getItem(BEST_TIMES_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Build a category-level key (e.g. "word-search-medium") for best-time tracking */
function categoryKey(category?: string, difficulty?: string): string | null {
  if (!category || !difficulty) return null;
  return `${category}-${difficulty}`;
}

function saveBestTime(puzzleKey: string, time: number, category?: string, difficulty?: string) {
  const times = getBestTimes();
  // Track against the category+difficulty key so best times persist across seeds
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
}

export function usePuzzleTimer(puzzleKey: string, options?: TimerOptions) {
  const [state, setState] = useState<TimerState>({ elapsed: 0, isRunning: true, isSolved: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Look up best time by category+difficulty (persistent across seeds)
  const catKey = categoryKey(options?.category, options?.difficulty);
  const bestTime = getBestTimes()[catKey || puzzleKey]?.time ?? null;

  useEffect(() => {
    setState({ elapsed: 0, isRunning: true, isSolved: false });
  }, [puzzleKey]);

  useEffect(() => {
    if (state.isRunning && !state.isSolved) {
      intervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsed: s.elapsed + 1 }));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.isSolved, puzzleKey]);

  const pause = useCallback(() => setState((s) => ({ ...s, isRunning: false })), []);
  const resume = useCallback(() => setState((s) => (s.isSolved ? s : { ...s, isRunning: true })), []);

  const solve = useCallback(() => {
    setState((s) => ({ ...s, isRunning: false, isSolved: true }));
    const isNew = saveBestTime(puzzleKey, state.elapsed, options?.category, options?.difficulty);
    if (options?.category && options?.difficulty) {
      recordCompletion(puzzleKey, options.category, options.difficulty, state.elapsed);
      if (puzzleKey.startsWith("daily-")) {
        const challenge = getTodaysChallenge();
        if (puzzleKey === `daily-${challenge.dateStr}-${challenge.category}-${challenge.difficulty}`) {
          recordDailyCompletion(challenge.dateStr, state.elapsed, challenge.category, challenge.difficulty);
        }
      }
    }
    return { time: state.elapsed, isNewBest: isNew };
  }, [puzzleKey, state.elapsed, options?.category, options?.difficulty]);

  const reset = useCallback(() => {
    setState({ elapsed: 0, isRunning: true, isSolved: false });
  }, []);

  return {
    elapsed: state.elapsed,
    isRunning: state.isRunning,
    isSolved: state.isSolved,
    bestTime,
    pause,
    resume,
    solve,
    reset,
  };
}
