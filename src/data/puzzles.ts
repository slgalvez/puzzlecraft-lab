export type PuzzleType = "crossword" | "number-fill" | "word-fill";
export type Difficulty = "easy" | "medium" | "hard";

export interface PuzzleInfo {
  id: string;
  title: string;
  type: PuzzleType;
  difficulty: Difficulty;
  size: string;
  isDaily?: boolean;
  date?: string;
}

export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

export interface CrosswordPuzzle extends PuzzleInfo {
  type: "crossword";
  gridSize: number;
  blackCells: [number, number][];
  clues: CrosswordClue[];
}

export interface FillInPuzzle extends PuzzleInfo {
  type: "number-fill" | "word-fill";
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];
  solution: (string | null)[][];
}

// Sample crossword
export const sampleCrossword: CrosswordPuzzle = {
  id: "cw-001",
  title: "Monday Morning",
  type: "crossword",
  difficulty: "easy",
  size: "5×5",
  gridSize: 5,
  blackCells: [[0,4],[1,4],[2,2],[3,0],[4,0]],
  clues: [
    { number: 1, clue: "Feline pet", answer: "CATS", row: 0, col: 0, direction: "across" },
    { number: 5, clue: "Not closed", answer: "OPEN", row: 1, col: 0, direction: "across" },
    { number: 6, clue: "Crimson", answer: "RED", row: 2, col: 3, direction: "down" },
    { number: 7, clue: "Melody", answer: "TUNE", row: 3, col: 1, direction: "across" },
    { number: 8, clue: "Correct", answer: "RIGHT", row: 4, col: 1, direction: "across" },
    { number: 1, clue: "Vehicle", answer: "CORN", row: 0, col: 0, direction: "down" },
    { number: 2, clue: "Help", answer: "AID", row: 0, col: 1, direction: "down" },
    { number: 3, clue: "Journey", answer: "TRIP", row: 0, col: 2, direction: "down" },
    { number: 4, clue: "Lock opener", answer: "KEY", row: 0, col: 3, direction: "down" },
  ],
};

// Sample number fill-in
export const sampleNumberFill: FillInPuzzle = {
  id: "nf-001",
  title: "Number Crunch",
  type: "number-fill",
  difficulty: "medium",
  size: "5×5",
  gridSize: 5,
  blackCells: [[0,2],[2,0],[2,4],[4,2]],
  entries: ["123", "456", "789", "31", "64", "97", "1469", "2578", "3456"],
  solution: [
    ["1","4",null,"6","9"],
    ["2","5","7","8","3"],
    [null,"3","4","5",null],
    ["6","1","9","7","2"],
    ["8","2",null,"4","6"],
  ],
};

// Sample word fill-in
export const sampleWordFill: FillInPuzzle = {
  id: "wf-001",
  title: "Word Weave",
  type: "word-fill",
  difficulty: "easy",
  size: "5×5",
  gridSize: 5,
  blackCells: [[0,4],[1,4],[2,2],[3,0],[4,0]],
  entries: ["CATS", "OPEN", "TUNE", "RIDE", "CORN", "AID", "TRIP", "KEY"],
  solution: [
    ["C","A","T","S",null],
    ["O","P","E","N",null],
    ["R","I",null,"D","E"],
    [null,"T","U","N","E"],
    [null,"R","I","D","E"],
  ],
};

export const allPuzzles: PuzzleInfo[] = [
  { ...sampleCrossword },
  { ...sampleNumberFill },
  { ...sampleWordFill },
  { id: "cw-002", title: "Tuesday Teaser", type: "crossword", difficulty: "medium", size: "7×7" },
  { id: "cw-003", title: "Weekend Challenge", type: "crossword", difficulty: "hard", size: "9×9" },
  { id: "nf-002", title: "Digits Delight", type: "number-fill", difficulty: "easy", size: "5×5" },
  { id: "nf-003", title: "Number Maze", type: "number-fill", difficulty: "hard", size: "7×7" },
  { id: "wf-002", title: "Lexicon Lane", type: "word-fill", difficulty: "medium", size: "7×7" },
  { id: "wf-003", title: "Vocabulary Vault", type: "word-fill", difficulty: "hard", size: "9×9" },
];

export const dailyPuzzle: PuzzleInfo = {
  ...sampleCrossword,
  id: "daily",
  title: "Daily Crossword",
  isDaily: true,
  date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
};

export function getPuzzleById(id: string): CrosswordPuzzle | FillInPuzzle | undefined {
  if (id === "daily" || id === "cw-001") return sampleCrossword;
  if (id === "nf-001") return sampleNumberFill;
  if (id === "wf-001") return sampleWordFill;
  return undefined;
}
