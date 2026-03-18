import { useState, useEffect, useRef, useCallback } from "react";
import { recordCompletion } from "@/lib/progressTracker";
import { recordDailyCompletion, getTodaysChallenge } from "@/lib/dailyChallenge";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

interface TimerState {
  elapsed: number;
  isRunning: boolean;
  isSolved: boolean;
  countdown: number; // >0 means countdown phase active
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

/** Build a category-level key (e.g. "word-search-medium") for best-time tracking */
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
}

export function usePuzzleTimer(puzzleKey: string, options?: TimerOptions) {
  const initialElapsed = options?.initialElapsed ?? 0;
  // Skip countdown when resuming a saved puzzle
  const skipCountdown = initialElapsed > 0;

  const [state, setState] = useState<TimerState>({
    elapsed: initialElapsed,
    isRunning: false,
    isSolved: false,
    countdown: skipCountdown ? 0 : COUNTDOWN_SECONDS,
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
    if (state.isRunning && !state.isSolved && state.countdown === 0) {
      intervalRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsed: s.elapsed + 1 }));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.isSolved, state.countdown, puzzleKey]);

  const pause = useCallback(() => setState((s) => ({ ...s, isRunning: false })), []);
  const resume = useCallback(() => setState((s) => (s.isSolved || s.countdown > 0 ? s : { ...s, isRunning: true })), []);

  const solve = useCallback(() => {
    setState((s) => ({ ...s, isRunning: false, isSolved: true, countdown: 0 }));
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
    setState({ elapsed: 0, isRunning: false, isSolved: false, countdown: COUNTDOWN_SECONDS });
  }, []);

  return {
    elapsed: state.elapsed,
    isRunning: state.isRunning,
    isSolved: state.isSolved,
    countdown: state.countdown,
    bestTime,
    pause,
    resume,
    solve,
    reset,
  };
}
