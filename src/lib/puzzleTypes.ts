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
