import { useState, useEffect, useRef, useCallback } from "react";

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

function saveBestTime(puzzleKey: string, time: number) {
  const times = getBestTimes();
  const existing = times[puzzleKey];
  if (!existing || time < existing.time) {
    times[puzzleKey] = { time, date: new Date().toISOString() };
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

export function usePuzzleTimer(puzzleKey: string) {
  const [state, setState] = useState<TimerState>({ elapsed: 0, isRunning: true, isSolved: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bestTime = getBestTimes()[puzzleKey]?.time ?? null;

  useEffect(() => {
    // Reset on puzzle change
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
    const isNew = saveBestTime(puzzleKey, state.elapsed);
    return { time: state.elapsed, isNewBest: isNew };
  }, [puzzleKey, state.elapsed]);

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
