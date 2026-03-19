import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";

export interface SudokuPuzzle {
  grid: (number | null)[][];
  solution: number[][];
}

const GIVENS: Record<Difficulty, number> = {
  easy: 45, medium: 36, hard: 28, extreme: 22, insane: 17,
};

export function generateSudoku(seed: number, difficulty: Difficulty): SudokuPuzzle {
  const rng = new SeededRandom(seed);
  const solution = createSolvedGrid(rng);
  const grid = removeClues(solution, GIVENS[difficulty], rng);
  return { grid, solution };
}

function createSolvedGrid(rng: SeededRandom): number[][] {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(grid, rng);
  return grid;
}

function fillGrid(grid: number[][], rng: SeededRandom): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue;
      const nums = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const n of nums) {
        if (isValid(grid, r, c, n)) {
          grid[r][c] = n;
          if (fillGrid(grid, rng)) return true;
          grid[r][c] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

function isValid(grid: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (grid[br + i][bc + j] === num) return false;
  return true;
}

function removeClues(
  solution: number[][],
  givens: number,
  rng: SeededRandom
): (number | null)[][] {
  const grid = solution.map((r) => r.map((v) => v as number | null));
  const cells = rng.shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  let removed = 0;
  const target = 81 - givens;
  for (const [r, c] of cells) {
    if (removed >= target) break;
    const val = grid[r][c];
    grid[r][c] = null;
    if (countSolutions(grid) > 1) {
      grid[r][c] = val; // uniqueness violated, put it back
    } else {
      removed++;
    }
  }
  return grid;
}

/** Count solutions up to a limit of 2 (enough to verify uniqueness). */
function countSolutions(grid: (number | null)[][]): number {
  const g = grid.map((r) => r.map((v) => v ?? 0));
  let count = 0;

  function solve(pos: number): boolean {
    while (pos < 81) {
      const r = Math.floor(pos / 9), c = pos % 9;
      if (g[r][c] === 0) break;
      pos++;
    }
    if (pos >= 81) { count++; return count >= 2; }
    const r = Math.floor(pos / 9), c = pos % 9;
    for (let n = 1; n <= 9; n++) {
      if (isValid(g, r, c, n)) {
        g[r][c] = n;
        if (solve(pos + 1)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  }

  solve(0);
  return count;
}
