import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";

export interface SudokuPuzzle {
  grid: (number | null)[][];
  solution: number[][];
}

const GIVENS: Record<Difficulty, number> = {
  easy: 42, medium: 34, hard: 28, extreme: 24, insane: 20,
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
  let toRemove = 81 - givens;
  for (const [r, c] of cells) {
    if (toRemove <= 0) break;
    grid[r][c] = null;
    toRemove--;
  }
  return grid;
}
