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
