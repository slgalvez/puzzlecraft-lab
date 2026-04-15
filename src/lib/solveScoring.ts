/**
 * solveScoring.ts
 * src/lib/solveScoring.ts
 *
 * Puzzlecraft+ Solve Scoring Engine with recalibrated tiers and solve gates.
 *
 * Score = 1000 × DifficultyMult × SpeedFactor × AccuracyFactor × HintFactor
 *
 * CALIBRATION (v2):
 *   Average easy player   (~700)  → Casual
 *   Average medium player (~1000) → Skilled
 *   Fast hard player      (~1400) → Advanced
 *   Elite hard/insane     (~1800) → Expert
 *
 * Minimum solve gates prevent 1-solve Expert assignments.
 * Use getSkillTier(rating, solveCount) for all user-facing displays.
 */

import type { PuzzleCategory, Difficulty } from "./puzzleTypes";
import type { SolveRecord } from "./solveTracker";

// ── Difficulty multipliers ─────────────────────────────────────────────────

const DIFFICULTY_MULT: Record<Difficulty, number> = {
  easy:    0.7,
  medium:  1.0,
  hard:    1.4,
  extreme: 1.9,
  insane:  2.8,
};

// ── Expected solve times (seconds) per type × difficulty ──────────────────

const EXPECTED_TIMES: Record<PuzzleCategory, Record<Difficulty, number>> = {
  crossword:     { easy: 180, medium: 300, hard: 480, extreme: 840,  insane: 1150 },
  "word-fill":   { easy: 120, medium: 210, hard: 360, extreme: 420,  insane: 560  },
  "number-fill": { easy: 120, medium: 210, hard: 360, extreme: 400,  insane: 520  },
  sudoku:        { easy: 180, medium: 360, hard: 600, extreme: 900,  insane: 1200 },
  "word-search": { easy: 60,  medium: 120, hard: 210, extreme: 240,  insane: 340  },
  kakuro:        { easy: 180, medium: 300, hard: 480, extreme: 720,  insane: 1000 },
  nonogram:      { easy: 120, medium: 240, hard: 420, extreme: 660,  insane: 900  },
  cryptogram:    { easy: 90,  medium: 180, hard: 300, extreme: 420,  insane: 560  },
};

// ── Mistake forgiveness ────────────────────────────────────────────────────

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

// ── Score calculation ──────────────────────────────────────────────────────

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

// ── Rating windows ─────────────────────────────────────────────────────────

const RATING_WINDOW           = 25;
const TYPE_RATING_WINDOW      = 15;
const MIN_SOLVES_FOR_RATING   = 5;
const MIN_SOLVES_FOR_LEADERBOARD = 10;
const MIN_TYPE_SOLVES_FOR_LEADERBOARD = 5;

export const LEADERBOARD_MIN_SOLVES      = MIN_SOLVES_FOR_LEADERBOARD;
export const TYPE_LEADERBOARD_MIN_SOLVES = MIN_TYPE_SOLVES_FOR_LEADERBOARD;

export function computePlayerRating(records: SolveRecord[]): number {
  const valid = records.filter((r) => r.solveTime >= 10);
  if (valid.length === 0) return 0;
  const window = valid.slice(0, RATING_WINDOW);
  const total = window.reduce((sum, r) => sum + computeSolveScore(r), 0);
  return Math.round(total / window.length);
}

/** Per-puzzle-type rating. Filters to the given type then computes. */
export function computeTypeRating(records: SolveRecord[], puzzleType: PuzzleCategory): number {
  const typeRecords = records.filter(
    (r) => r.puzzleType === puzzleType && r.solveTime >= 10
  );
  if (typeRecords.length === 0) return 0;
  const window = typeRecords.slice(0, TYPE_RATING_WINDOW);
  const total = window.reduce((sum, r) => sum + computeSolveScore(r), 0);
  return Math.round(total / window.length);
}

// ── Skill Tiers ────────────────────────────────────────────────────────────

export type SkillTier = "Beginner" | "Casual" | "Skilled" | "Advanced" | "Expert";

const TIER_RATING_THRESHOLDS: Record<SkillTier, number> = {
  Expert:   1650,
  Advanced: 1300,
  Skilled:  850,
  Casual:   650,
  Beginner: 0,
};

/** Minimum solve count needed to DISPLAY a tier (prevents 1-solve Expert). */
export const TIER_MIN_SOLVES: Record<SkillTier, number> = {
  Beginner: 0,
  Casual:   3,
  Skilled:  8,
  Advanced: 18,
  Expert:   30,
};

const TIER_ORDER: SkillTier[] = ["Beginner", "Casual", "Skilled", "Advanced", "Expert"];

/**
 * Returns the skill tier for a given rating.
 *
 * @param rating      - The computed player rating
 * @param solveCount  - Optional. When provided, caps the tier at the level
 *                      the user has earned through enough solves. Always pass
 *                      this when displaying a user's own tier.
 */
export function getSkillTier(rating: number, solveCount?: number): SkillTier {
  let ratingTier: SkillTier = "Beginner";
  for (const tier of [...TIER_ORDER].reverse()) {
    if (rating >= TIER_RATING_THRESHOLDS[tier]) {
      ratingTier = tier;
      break;
    }
  }

  if (solveCount === undefined) return ratingTier;

  let maxUnlockedTier: SkillTier = "Beginner";
  for (const tier of TIER_ORDER) {
    if (solveCount >= TIER_MIN_SOLVES[tier]) maxUnlockedTier = tier;
  }

  const ratingIdx   = TIER_ORDER.indexOf(ratingTier);
  const unlockedIdx = TIER_ORDER.indexOf(maxUnlockedTier);
  return TIER_ORDER[Math.min(ratingIdx, unlockedIdx)];
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

/** Progress within current tier as 0–100. */
export function getTierProgress(rating: number): number {
  const bands: [number, number][] = [
    [0,    650],
    [650,  850],
    [850,  1300],
    [1300, 1650],
    [1650, 2400],
  ];
  for (const [low, high] of bands) {
    if (rating < high) {
      return Math.round(((rating - low) / (high - low)) * 100);
    }
  }
  return 100;
}

// ── Unified rating info object ─────────────────────────────────────────────

export interface PlayerRatingInfo {
  /** Computed rating score (0 if no data) */
  rating: number;
  /** Tier accounting for both rating AND solve count gate */
  tier: SkillTier;
  /** Tailwind color class for the tier */
  tierColor: string;
  /** 0–100 progress within the current tier band */
  tierProgress: number;
  /**
   * True when the user has enough solves to show a rating (5–9)
   * but not enough to appear on the public leaderboard (10+).
   */
  isProvisional: boolean;
  /** True when the user has fewer than MIN_SOLVES_FOR_RATING valid solves */
  hasNoData: boolean;
  /** Total valid solve count */
  solveCount: number;
  /** How many more solves until the rating is confirmed (non-provisional) */
  solvesUntilConfirmed: number;
  /** How many more solves until the user qualifies for the global leaderboard */
  solvesUntilLeaderboard: number;
  /** Whether the user has qualified for the public leaderboard */
  onLeaderboard: boolean;
}

/**
 * Unified rating info for use in Stats, IOSStatsTab, CompletionPanel, etc.
 */
export function getPlayerRatingInfo(records: SolveRecord[]): PlayerRatingInfo {
  const valid = records.filter((r) => r.solveTime >= 10);
  const solveCount = valid.length;

  if (solveCount < MIN_SOLVES_FOR_RATING) {
    return {
      rating:                 0,
      tier:                   "Beginner",
      tierColor:              getTierColor("Beginner"),
      tierProgress:           0,
      isProvisional:          false,
      hasNoData:              true,
      solveCount,
      solvesUntilConfirmed:   Math.max(0, MIN_SOLVES_FOR_RATING - solveCount),
      solvesUntilLeaderboard: Math.max(0, MIN_SOLVES_FOR_LEADERBOARD - solveCount),
      onLeaderboard:          false,
    };
  }

  const rating = computePlayerRating(valid);
  const tier      = getSkillTier(rating, solveCount);
  const tierColor = getTierColor(tier);

  return {
    rating,
    tier,
    tierColor,
    tierProgress:           getTierProgress(rating),
    isProvisional:          solveCount < MIN_SOLVES_FOR_LEADERBOARD,
    hasNoData:              false,
    solveCount,
    solvesUntilConfirmed:   0,
    solvesUntilLeaderboard: Math.max(0, MIN_SOLVES_FOR_LEADERBOARD - solveCount),
    onLeaderboard:          solveCount >= MIN_SOLVES_FOR_LEADERBOARD,
  };
}
