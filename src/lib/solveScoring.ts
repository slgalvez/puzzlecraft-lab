/**
 * Puzzlecraft+ Solve Scoring Engine
 *
 * Calculates a fair, performance-based score per completed puzzle:
 *   Score = 1000 × DifficultyMult × SpeedFactor × AccuracyFactor × HintFactor
 *
 * Includes puzzle-type-aware mistake forgiveness so normal input friction
 * (drag imprecision, overlap corrections, quick self-corrections) is not
 * penalised as a "true mistake".
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";
import type { SolveRecord } from "./solveTracker";

// ── Difficulty multipliers ──

const DIFFICULTY_MULT: Record<Difficulty, number> = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.4,
  extreme: 1.9,
  insane: 2.8,
};

// ── Expected solve times (seconds) per type × difficulty ──

const EXPECTED_TIMES: Record<PuzzleCategory, Record<Difficulty, number>> = {
  crossword:    { easy: 180, medium: 300, hard: 480, extreme: 720, insane: 1000 },
  "word-fill":  { easy: 120, medium: 210, hard: 360, extreme: 540, insane: 780 },
  "number-fill":{ easy: 120, medium: 210, hard: 360, extreme: 540, insane: 780 },
  sudoku:       { easy: 180, medium: 360, hard: 600, extreme: 900, insane: 1200 },
  "word-search":{ easy: 60,  medium: 120, hard: 210, extreme: 330, insane: 480 },
  kakuro:       { easy: 180, medium: 300, hard: 480, extreme: 720, insane: 1000 },
  nonogram:     { easy: 120, medium: 240, hard: 420, extreme: 660, insane: 900 },
  cryptogram:   { easy: 90,  medium: 180, hard: 300, extreme: 480, insane: 660 },
};

// ── Mistake forgiveness ──
//
// Each puzzle type gets a number of "free" mistakes that are assumed to be
// input friction (drag imprecision, overlap re-entry, quick corrections)
// rather than genuine solve errors.

const FORGIVEN_MISTAKES: Record<PuzzleCategory, number> = {
  "word-search": 3,   // drag imprecision
  "word-fill": 2,     // overlap corrections
  "number-fill": 2,
  crossword: 2,       // overlap / quick retype
  cryptogram: 2,      // quick letter swaps before check
  sudoku: 1,
  kakuro: 1,
  nonogram: 1,
};

/** Returns the effective ("true") mistake count after forgiveness. */
export function trueMistakes(record: SolveRecord): number {
  const forgiven = FORGIVEN_MISTAKES[record.puzzleType] ?? 1;
  return Math.max(0, record.mistakesCount - forgiven);
}

// ── Score calculation ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Calculate the score for a single completed solve. */
export function computeSolveScore(record: SolveRecord): number {
  // Filter out trivially short solves
  if (record.solveTime < 10) return 0;

  const diffMult = DIFFICULTY_MULT[record.difficulty] ?? 1.0;

  // Speed factor
  const expected = EXPECTED_TIMES[record.puzzleType]?.[record.difficulty] ?? 300;
  const speedFactor = clamp(expected / record.solveTime, 0.6, 1.4);

  // Accuracy factor (using forgiven mistakes)
  const mistakes = trueMistakes(record);
  const accuracyFactor = clamp(1 - mistakes * 0.05, 0.7, 1.0);

  // Hint factor
  const hintFactor =
    record.hintsUsed === 0 ? 1.0 :
    record.hintsUsed === 1 ? 0.9 :
    record.hintsUsed === 2 ? 0.8 : 0.7;

  let score = 1000 * diffMult * speedFactor * accuracyFactor * hintFactor;

  // High-difficulty bonus: clean Insane solve (no hints, ≤1 true mistake) → +5%
  if (record.difficulty === "insane" && record.hintsUsed === 0 && mistakes <= 1) {
    score *= 1.05;
  }

  return Math.round(score);
}

// ── Player Rating (rolling window) ──

const RATING_WINDOW = 25; // last 20–30 solves

export function computePlayerRating(records: SolveRecord[]): number {
  // Filter valid solves
  const valid = records.filter((r) => r.solveTime >= 10);
  if (valid.length === 0) return 0;

  const window = valid.slice(0, RATING_WINDOW);
  const total = window.reduce((sum, r) => sum + computeSolveScore(r), 0);
  return Math.round(total / window.length);
}

// ── Skill Tiers ──

export type SkillTier = "Beginner" | "Casual" | "Skilled" | "Advanced" | "Expert";

export function getSkillTier(rating: number): SkillTier {
  if (rating >= 1200) return "Expert";
  if (rating >= 950) return "Advanced";
  if (rating >= 700) return "Skilled";
  if (rating >= 400) return "Casual";
  return "Beginner";
}

export function getTierColor(tier: SkillTier): string {
  switch (tier) {
    case "Expert": return "text-amber-500";
    case "Advanced": return "text-primary";
    case "Skilled": return "text-emerald-500";
    case "Casual": return "text-sky-500";
    case "Beginner": return "text-muted-foreground";
  }
}

/** Progress within current tier as 0–100. */
export function getTierProgress(rating: number): number {
  const bands: [number, number][] = [
    [0, 400],
    [400, 700],
    [700, 950],
    [950, 1200],
    [1200, 1800],
  ];
  for (const [low, high] of bands) {
    if (rating < high) {
      return Math.round(((rating - low) / (high - low)) * 100);
    }
  }
  return 100;
}
