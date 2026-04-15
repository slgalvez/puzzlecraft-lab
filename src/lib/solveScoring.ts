/**
 * solveScoring.ts
 * src/lib/solveScoring.ts
 *
 * Puzzlecraft+ Solve Scoring Engine with provisional rating support.
 *
 * Score = 1000 × DifficultyMult × SpeedFactor × AccuracyFactor × HintFactor
 *
 * Exports:
 * - PROVISIONAL_THRESHOLD (5) and LEADERBOARD_THRESHOLD (10) as shared constants
 * - getPlayerRatingInfo() — unified function replacing scattered computePlayerRating + getSkillTier calls
 */

import type { PuzzleCategory, Difficulty } from "./puzzleTypes";
import type { SolveRecord } from "./solveTracker";

// ── Thresholds ────────────────────────────────────────────────────────────

/** Solves required before rating is no longer "provisional". */
export const PROVISIONAL_THRESHOLD = 5;

/** Solves required before appearing on the global leaderboard. */
export const LEADERBOARD_THRESHOLD = 10;

// ── Difficulty multipliers ────────────────────────────────────────────────

const DIFFICULTY_MULT: Record<Difficulty, number> = {
  easy:    0.7,
  medium:  1.0,
  hard:    1.4,
  extreme: 1.9,
  insane:  2.8,
};

// ── Expected solve times ──────────────────────────────────────────────────

const EXPECTED_TIMES: Record<PuzzleCategory, Record<Difficulty, number>> = {
  crossword:    { easy: 180, medium: 300, hard: 480, extreme: 840,  insane: 1150 },
  "word-fill":  { easy: 120, medium: 210, hard: 360, extreme: 420,  insane: 560  },
  "number-fill":{ easy: 120, medium: 210, hard: 360, extreme: 400,  insane: 520  },
  sudoku:       { easy: 180, medium: 360, hard: 600, extreme: 900,  insane: 1200 },
  "word-search":{ easy: 60,  medium: 120, hard: 210, extreme: 240,  insane: 340  },
  kakuro:       { easy: 180, medium: 300, hard: 480, extreme: 720,  insane: 1000 },
  nonogram:     { easy: 120, medium: 240, hard: 420, extreme: 660,  insane: 900  },
  cryptogram:   { easy: 90,  medium: 180, hard: 300, extreme: 420,  insane: 560  },
};

// ── Mistake forgiveness ───────────────────────────────────────────────────

const FORGIVEN_MISTAKES: Record<PuzzleCategory, number> = {
  "word-search":  3,
  "word-fill":    2,
  "number-fill":  2,
  crossword:      2,
  cryptogram:     2,
  sudoku:         1,
  kakuro:         1,
  nonogram:       1,
};

export function trueMistakes(record: SolveRecord): number {
  const forgiven = FORGIVEN_MISTAKES[record.puzzleType] ?? 1;
  return Math.max(0, record.mistakesCount - forgiven);
}

// ── Score calculation ─────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeSolveScore(record: SolveRecord): number {
  if (record.solveTime < 10) return 0;

  const diffMult     = DIFFICULTY_MULT[record.difficulty] ?? 1.0;
  const expected     = EXPECTED_TIMES[record.puzzleType]?.[record.difficulty] ?? 300;
  const speedFactor  = clamp(expected / record.solveTime, 0.6, 1.4);
  const mistakes     = trueMistakes(record);
  const accuracyFactor = clamp(1 - mistakes * 0.05, 0.7, 1.0);
  const hintFactor   =
    record.hintsUsed === 0 ? 1.0 :
    record.hintsUsed === 1 ? 0.9 :
    record.hintsUsed === 2 ? 0.8 : 0.7;

  let score = 1000 * diffMult * speedFactor * accuracyFactor * hintFactor;
  if (record.difficulty === "insane" && record.hintsUsed === 0 && mistakes <= 1) {
    score *= 1.05;
  }
  return Math.round(score);
}

// ── Player Rating ─────────────────────────────────────────────────────────

const RATING_WINDOW = 25;

export function computePlayerRating(records: SolveRecord[]): number {
  const valid = records.filter((r) => r.solveTime >= 10);
  if (valid.length === 0) return 0;
  const window = valid.slice(0, RATING_WINDOW);
  const total  = window.reduce((sum, r) => sum + computeSolveScore(r), 0);
  return Math.round(total / window.length);
}

// ── Skill Tiers ───────────────────────────────────────────────────────────

export type SkillTier = "Beginner" | "Casual" | "Skilled" | "Advanced" | "Expert";

export function getSkillTier(rating: number): SkillTier {
  if (rating >= 1200) return "Expert";
  if (rating >= 950)  return "Advanced";
  if (rating >= 700)  return "Skilled";
  if (rating >= 400)  return "Casual";
  return "Beginner";
}

export function getTierColor(tier: SkillTier): string {
  switch (tier) {
    case "Expert":   return "text-amber-500";
    case "Advanced": return "text-primary";
    case "Skilled":  return "text-emerald-500";
    case "Casual":   return "text-sky-500";
    case "Beginner": return "text-muted-foreground";
  }
}

// ── Tier Visual Styles ────────────────────────────────────────────────────

const TIER_CARD_STYLES: Record<SkillTier, string> = {
  Beginner:  "border-border bg-muted/30",
  Casual:    "border-sky-500/30 bg-sky-500/[0.06]",
  Skilled:   "border-emerald-500/30 bg-emerald-500/[0.06]",
  Advanced:  "border-primary/30 bg-primary/[0.07]",
  Expert:    "border-amber-500/35 bg-amber-500/[0.08]",
};

const TIER_BADGE_STYLES: Record<SkillTier, string> = {
  Beginner:  "bg-muted text-muted-foreground",
  Casual:    "bg-sky-500/15 text-sky-500",
  Skilled:   "bg-emerald-500/15 text-emerald-500",
  Advanced:  "bg-primary/15 text-primary",
  Expert:    "bg-amber-500/15 text-amber-500",
};

export function getTierCardStyle(tier: SkillTier): string {
  return TIER_CARD_STYLES[tier] ?? TIER_CARD_STYLES.Beginner;
}

export function getTierBadgeStyle(tier: SkillTier): string {
  return TIER_BADGE_STYLES[tier] ?? TIER_BADGE_STYLES.Beginner;
}

export function getTierProgress(rating: number): number {
  const bands: [number, number][] = [
    [0, 400], [400, 700], [700, 950], [950, 1200], [1200, 1800],
  ];
  for (const [low, high] of bands) {
    if (rating < high) {
      return Math.round(((rating - low) / (high - low)) * 100);
    }
  }
  return 100;
}

// ── Provisional Rating Info ───────────────────────────────────────────────

export interface PlayerRatingInfo {
  /** The computed rating. 0 only when solveCount === 0. */
  rating: number;
  /** Skill tier based on rating. */
  tier: SkillTier;
  /** Tier colour class. */
  tierColor: string;
  /** Progress within current tier (0–100). */
  tierProgress: number;
  /** True when user has 1–(PROVISIONAL_THRESHOLD-1) qualifying solves. */
  isProvisional: boolean;
  /** True when user has zero qualifying solves. */
  hasNoData: boolean;
  /** Number of qualifying solves. */
  solveCount: number;
  /** How many more solves until provisional label is removed. */
  solvesUntilConfirmed: number;
  /** How many more solves until leaderboard appearance. */
  solvesUntilLeaderboard: number;
  /** Whether this rating appears on the global leaderboard. */
  onLeaderboard: boolean;
}

/**
 * Unified rating info for a set of solve records.
 *
 * This is the single source of truth for all rating-related UI.
 * Use it everywhere instead of calling computePlayerRating + getSkillTier
 * separately — this ensures provisional state is always reflected correctly.
 *
 * @param records - filtered real user records (no demo data)
 */
export function getPlayerRatingInfo(records: SolveRecord[]): PlayerRatingInfo {
  const valid      = records.filter((r) => r.solveTime >= 10);
  const solveCount = valid.length;

  const hasNoData      = solveCount === 0;
  const isProvisional  = solveCount > 0 && solveCount < PROVISIONAL_THRESHOLD;
  const onLeaderboard  = solveCount >= LEADERBOARD_THRESHOLD;

  const rating      = hasNoData ? 0 : computePlayerRating(valid);
  const tier        = getSkillTier(rating);
  const tierColor   = getTierColor(tier);
  const tierProgress = getTierProgress(rating);

  const solvesUntilConfirmed  = Math.max(0, PROVISIONAL_THRESHOLD  - solveCount);
  const solvesUntilLeaderboard = Math.max(0, LEADERBOARD_THRESHOLD - solveCount);

  return {
    rating,
    tier,
    tierColor,
    tierProgress,
    isProvisional,
    hasNoData,
    solveCount,
    solvesUntilConfirmed,
    solvesUntilLeaderboard,
    onLeaderboard,
  };
}