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
const CANDIDATES: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4, extreme: 3, insane: 3 };

// ── Predefined image patterns (5×5 base) ──
// Each pattern is a 5×5 grid of 0/1, designed to form a recognizable shape.
// They get scaled up to the target grid size.

const PATTERNS_5x5: number[][][] = [
  // Heart
  [
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ],
  // Crown
  [
    [0,1,0,1,0],
    [0,1,0,1,0],
    [1,1,1,1,1],
    [1,1,1,1,1],
    [0,1,1,1,0],
  ],
  // Smiley
  [
    [0,1,1,1,0],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,1,0,1,1],
    [0,1,1,1,0],
  ],
  // Star
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,1,0,1,0],
  ],
  // Arrow up
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,0,1,0,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  // Diamond
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
    [0,0,1,0,0],
  ],
  // House
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [1,1,0,1,1],
    [1,1,0,1,1],
  ],
  // Cross / Plus
  [
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  // Cat face
  [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  // Anchor
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [0,0,1,0,0],
    [1,0,1,0,1],
    [0,1,1,1,0],
  ],
  // Boat
  [
    [0,0,1,0,0],
    [0,0,1,1,0],
    [0,0,1,0,0],
    [1,1,1,1,1],
    [0,1,1,1,0],
  ],
  // Tree
  [
    [0,0,1,0,0],
    [0,1,1,1,0],
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,1,1,1,0],
  ],
];

/**
 * Scale a 5×5 pattern to a target size by nearest-neighbor sampling,
 * then add seeded noise for variety.
 */
function scalePattern(pattern: number[][], targetSize: number, rng: SeededRandom): boolean[][] {
  const baseSize = pattern.length;
  const grid: boolean[][] = Array.from({ length: targetSize }, (_, r) =>
    Array.from({ length: targetSize }, (_, c) => {
      const srcR = Math.floor((r / targetSize) * baseSize);
      const srcC = Math.floor((c / targetSize) * baseSize);
      return pattern[srcR][srcC] === 1;
    })
  );

  // Add subtle noise: flip ~8% of cells to add texture while preserving shape
  const noiseRate = 0.08;
  for (let r = 0; r < targetSize; r++) {
    for (let c = 0; c < targetSize; c++) {
      if (rng.nextFloat() < noiseRate) {
        grid[r][c] = !grid[r][c];
      }
    }
  }

  // Ensure at least one filled cell per row and column
  for (let r = 0; r < targetSize; r++) {
    if (!grid[r].some(Boolean)) grid[r][rng.nextInt(0, targetSize - 1)] = true;
  }
  for (let c = 0; c < targetSize; c++) {
    if (!grid.some((row) => row[c])) grid[rng.nextInt(0, targetSize - 1)][c] = true;
  }

  return grid;
}

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

  // Pick a pattern based on seed
  const patternIdx = rng.nextInt(0, PATTERNS_5x5.length - 1);
  const pattern = PATTERNS_5x5[patternIdx];

  const solution = scalePattern(pattern, size, rng);

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
