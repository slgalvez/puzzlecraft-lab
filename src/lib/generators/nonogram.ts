import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import { scoreNonogramLayout, selectBestCandidate } from "./layoutScoring";

export interface NonogramPuzzle {
  rows: number;
  cols: number;
  solution: boolean[][];
  rowClues: number[][];
  colClues: number[][];
}

const SIZES: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 15, extreme: 20, insane: 25 };
const DENSITY: Record<Difficulty, number> = { easy: 0.6, medium: 0.5, hard: 0.48, extreme: 0.45, insane: 0.42 };
const CANDIDATES: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4, extreme: 3, insane: 3 };

export function generateNonogram(seed: number, difficulty: Difficulty): NonogramPuzzle {
  return selectBestCandidate(
    (s) => {
      const result = buildNonogram(s, difficulty);
      const score = scoreNonogramLayout(result.solution, result.rows);
      return { data: result, score };
    },
    seed,
    CANDIDATES[difficulty],
    2,
    55
  );
}

function buildNonogram(seed: number, difficulty: Difficulty): NonogramPuzzle {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const dens = DENSITY[difficulty];

  const solution = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => rng.nextBool(dens))
  );

  // Ensure at least one filled cell per row and column
  for (let r = 0; r < size; r++) {
    if (!solution[r].some(Boolean)) solution[r][rng.nextInt(0, size - 1)] = true;
  }
  for (let c = 0; c < size; c++) {
    if (!solution.some((row) => row[c])) solution[rng.nextInt(0, size - 1)][c] = true;
  }

  const rowClues = solution.map((row) => computeClue(row));
  const colClues = Array.from({ length: size }, (_, c) =>
    computeClue(solution.map((row) => row[c]))
  );

  return { rows: size, cols: size, solution, rowClues, colClues };
}

function computeClue(line: boolean[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const cell of line) {
    if (cell) {
      count++;
    } else if (count > 0) {
      clues.push(count);
      count = 0;
    }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}
