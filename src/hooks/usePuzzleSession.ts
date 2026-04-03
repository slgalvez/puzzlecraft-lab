/**
 * usePuzzleSession.ts
 * src/hooks/usePuzzleSession.ts
 *
 * Tracks per-session state that PuzzleHeader needs:
 *   - mistake count (incremented by grid components on wrong input)
 *   - progress (cells/words filled vs total)
 *   - personal best for this puzzle type + difficulty
 *
 * Usage inside any grid component:
 *
 *   const session = usePuzzleSession({ puzzleType: "crossword", difficulty: "medium" });
 *   session.recordMistake();           // call on wrong letter
 *   session.setProgress(7, 20);        // call whenever fill state changes
 */

import { useState, useCallback, useMemo } from "react";
import { getSolveRecords } from "@/lib/solveTracker";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

export type SessionDifficulty = "easy" | "medium" | "hard" | "extreme" | "insane";

interface UsePuzzleSessionOptions {
  puzzleType: PuzzleCategory;
  difficulty?: SessionDifficulty;
  /** Override the label shown in the progress bar (default: "cells") */
  progressUnit?: string;
}

export interface PuzzleSessionState {
  /** Number of incorrect inputs this session */
  mistakes: number;
  /** e.g. 7 */
  progressCurrent: number;
  /** e.g. 20 */
  progressTotal: number;
  /** e.g. "words" | "cells" | "letters" */
  progressUnit: string;
  /** 0–1 float for the progress bar */
  progressFraction: number;
  /** Personal best solve time in seconds for this type+difficulty, or null */
  personalBest: number | null;
  /** Imperative: call on every wrong input */
  recordMistake: () => void;
  /** Imperative: call whenever the fill state changes */
  setProgress: (current: number, total: number) => void;
  /** Reset the session (e.g. on restart) */
  reset: () => void;
}

export function usePuzzleSession({
  puzzleType,
  difficulty,
  progressUnit = "cells",
}: UsePuzzleSessionOptions): PuzzleSessionState {
  const [mistakes, setMistakes] = useState(0);
  const [progress, setProgressState] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Personal best — read once on mount (won't change mid-session)
  const personalBest = useMemo<number | null>(() => {
    try {
      const records = getSolveRecords();
      const matching = records.filter(
        (r) =>
          r.puzzleType === puzzleType &&
          (!difficulty || r.difficulty === difficulty) &&
          r.solveTime > 0
      );
      if (matching.length === 0) return null;
      return Math.min(...matching.map((r) => r.solveTime));
    } catch {
      return null;
    }
  }, [puzzleType, difficulty]);

  const recordMistake = useCallback(() => {
    setMistakes((n) => n + 1);
  }, []);

  const setProgress = useCallback((current: number, total: number) => {
    setProgressState({ current, total });
  }, []);

  const reset = useCallback(() => {
    setMistakes(0);
    setProgressState({ current: 0, total: 0 });
  }, []);

  const progressFraction =
    progress.total > 0
      ? Math.min(1, progress.current / progress.total)
      : 0;

  return {
    mistakes,
    progressCurrent: progress.current,
    progressTotal: progress.total,
    progressUnit,
    progressFraction,
    personalBest,
    recordMistake,
    setProgress,
    reset,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format seconds → "3:48" */
export function formatSessionTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Map PuzzleCategory to a human-readable label */
export function getPuzzleTypeLabel(type: PuzzleCategory): string {
  const LABELS: Partial<Record<PuzzleCategory, string>> = {
    crossword: "Crossword",
    "word-search": "Word Search",
    sudoku: "Sudoku",
    kakuro: "Kakuro",
    nonogram: "Nonogram",
    cryptogram: "Cryptogram",
    "word-fill": "Word Fill-In",
    "number-fill": "Number Fill-In",
  };
  return LABELS[type] ?? type;
}

/** Map difficulty key to display label */
export function getDifficultyLabel(d?: SessionDifficulty | string): string {
  if (!d) return "";
  return d.charAt(0).toUpperCase() + d.slice(1);
}
