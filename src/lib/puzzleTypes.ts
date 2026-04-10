export type Difficulty = "easy" | "medium" | "hard" | "extreme" | "insane";

export type PuzzleCategory =
  | "crossword"
  | "word-fill"
  | "number-fill"
  | "sudoku"
  | "word-search"
  | "kakuro"
  | "nonogram"
  | "cryptogram";

export const CATEGORY_INFO: Record<
  PuzzleCategory,
  { name: string; description: string; icon: string }
> = {
  crossword: { name: "Crossword", description: "Classic word puzzle with intersecting clues", icon: "📝" },
  "word-fill": { name: "Word Fill-In", description: "Place words into the grid pattern", icon: "📖" },
  "number-fill": { name: "Number Fill-In", description: "Fit numbers into the grid", icon: "🔢" },
  sudoku: { name: "Sudoku", description: "Fill the 9×9 grid with digits 1–9", icon: "🧮" },
  "word-search": { name: "Word Search", description: "Find hidden words in a letter grid", icon: "🔍" },
  kakuro: { name: "Kakuro", description: "Cross-sums — a number crossword", icon: "➕" },
  nonogram: { name: "Nonogram", description: "Reveal a picture using number clues", icon: "🎨" },
  cryptogram: { name: "Cryptogram", description: "Decode the secret message", icon: "🔐" },
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme",
  insane: "Insane",
};

/** Shared difficulty pill styling — neutral default, soft hover, soft-fill selected */
export const DIFFICULTY_HOVER: Record<Difficulty, string> = {
  easy:    "hover:border-emerald-400/40 hover:bg-emerald-400/5",
  medium:  "hover:border-amber-400/40 hover:bg-amber-400/5",
  hard:    "hover:border-orange-500/40 hover:bg-orange-500/5",
  extreme: "hover:border-rose-500/40 hover:bg-rose-500/5",
  insane:  "hover:border-violet-600/40 hover:bg-violet-600/5",
};

export const DIFFICULTY_SELECTED: Record<Difficulty, string> = {
  easy:    "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium:  "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  hard:    "border-orange-500/60 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  extreme: "border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  insane:  "border-violet-600/60 bg-violet-600/15 text-violet-700 dark:text-violet-300",
};

/** Difficulties that are disabled (not yet reliably supported) per puzzle type */
export const DISABLED_DIFFICULTIES: Partial<Record<PuzzleCategory, Set<Difficulty>>> = {
  kakuro: new Set(["insane"]),
};

export function isDifficultyDisabled(category: PuzzleCategory, difficulty: Difficulty): boolean {
  return DISABLED_DIFFICULTIES[category]?.has(difficulty) ?? false;
}

/** Fallback map: when a difficulty is disabled, use this instead */
const DIFFICULTY_FALLBACK: Partial<Record<Difficulty, Difficulty>> = {
  insane: "extreme",
};

/**
 * Returns the effective difficulty for a given category.
 * If the requested difficulty is disabled for that category, returns the fallback.
 */
export function getEffectiveDifficulty(category: PuzzleCategory, difficulty: Difficulty): Difficulty {
  if (isDifficultyDisabled(category, difficulty)) {
    return DIFFICULTY_FALLBACK[difficulty] ?? difficulty;
  }
  return difficulty;
}
