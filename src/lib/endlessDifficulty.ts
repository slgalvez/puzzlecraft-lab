/**
 * Adaptive difficulty engine for Endless Mode.
 * Tracks per-puzzle-type difficulty and adjusts based on performance signals.
 */
import type { Difficulty, PuzzleCategory } from "./puzzleTypes";

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard", "extreme", "insane"];

/** Performance signals collected during a puzzle attempt */
export interface PuzzlePerformance {
  elapsed: number;       // seconds to solve
  completed: boolean;    // was the puzzle actually solved?
  resets: number;        // how many times the user hit Reset
  checks: number;        // how many times the user hit Check Solution
  errorChecks: number;   // how many checks had errors
}

/** Time thresholds (seconds) per difficulty — universal across types */
const THRESHOLDS: Record<Difficulty, number> = {
  easy: 120,
  medium: 240,
  hard: 420,
  extreme: 600,
  insane: 900,
};

/**
 * Given current difficulty and performance signals, compute the next difficulty.
 *
 * Step UP if:
 *   - Completed AND elapsed < 50% of threshold AND resets === 0 AND errorChecks <= 1
 *
 * Step DOWN if:
 *   - Not completed (abandoned), OR
 *   - Elapsed > 130% of threshold, OR
 *   - resets >= 3, OR
 *   - errorChecks >= 3
 *
 * Otherwise STAY.
 */
export function computeNextDifficulty(
  current: Difficulty,
  perf: PuzzlePerformance
): { next: Difficulty; direction: "up" | "down" | "stay" } {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  const threshold = THRESHOLDS[current];

  // Step DOWN conditions
  if (
    !perf.completed ||
    perf.elapsed > threshold * 1.3 ||
    perf.resets >= 3 ||
    perf.errorChecks >= 3
  ) {
    if (idx > 0) return { next: DIFFICULTY_ORDER[idx - 1], direction: "down" };
    return { next: current, direction: "stay" };
  }

  // Step UP conditions
  if (
    perf.completed &&
    perf.elapsed < threshold * 0.5 &&
    perf.resets === 0 &&
    perf.errorChecks <= 1
  ) {
    if (idx < DIFFICULTY_ORDER.length - 1) return { next: DIFFICULTY_ORDER[idx + 1], direction: "up" };
    return { next: current, direction: "stay" };
  }

  return { next: current, direction: "stay" };
}

/** Create a fresh per-category difficulty map, all starting at "medium" */
export function createDifficultyMap(): Record<PuzzleCategory, Difficulty> {
  return {
    sudoku: "medium",
    "word-search": "medium",
    kakuro: "medium",
    nonogram: "medium",
    cryptogram: "medium",
    crossword: "medium",
    "word-fill": "medium",
    "number-fill": "medium",
  } as Record<PuzzleCategory, Difficulty>;
}
