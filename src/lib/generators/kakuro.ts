import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";

export interface KakuroClue {
  row: number;
  col: number;
  across?: number;
  down?: number;
}

export interface KakuroPuzzle {
  size: number;
  isBlack: boolean[][];
  solution: number[][];
  clues: KakuroClue[];
}

const SIZES: Record<Difficulty, number> = { easy: 6, medium: 7, hard: 8, extreme: 9, insane: 10 };
const BLACK_PROB: Record<Difficulty, number> = { easy: 0.22, medium: 0.2, hard: 0.18, extreme: 0.15, insane: 0.12 };

interface Run {
  cells: [number, number][];
}

export function generateKakuro(seed: number, difficulty: Difficulty): KakuroPuzzle {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = tryGenerate(seed + attempt * 1000, difficulty);
    if (result) return result;
  }
  return tryGenerate(seed, "easy")!;
}

function tryGenerate(seed: number, difficulty: Difficulty): KakuroPuzzle | null {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const isBlack = Array.from({ length: size }, () => Array(size).fill(false));

  // Border is black
  for (let i = 0; i < size; i++) {
    isBlack[0][i] = true;
    isBlack[i][0] = true;
  }

  // Random internal black cells
  for (let r = 1; r < size; r++)
    for (let c = 1; c < size; c++)
      if (rng.next() < BLACK_PROB[difficulty]) isBlack[r][c] = true;

  // Fix: remove isolated white cells (not in any run of 2+)
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 1; r < size; r++) {
      for (let c = 1; c < size; c++) {
        if (isBlack[r][c]) continue;
        const hLen = runLen(isBlack, r, c, 0, 1, size) + runLen(isBlack, r, c, 0, -1, size) - 1;
        const vLen = runLen(isBlack, r, c, 1, 0, size) + runLen(isBlack, r, c, -1, 0, size) - 1;
        if (hLen < 2 && vLen < 2) {
          isBlack[r][c] = true;
          changed = true;
        }
      }
    }
  }

  // Count white cells
  let whiteCount = 0;
  for (let r = 1; r < size; r++)
    for (let c = 1; c < size; c++)
      if (!isBlack[r][c]) whiteCount++;
  if (whiteCount < 4) return null;

  const runs = findRuns(isBlack, size);
  if (runs.length === 0) return null;

  // Build cell-to-runs lookup
  const cellRuns = new Map<string, Run[]>();
  for (const run of runs) {
    for (const [r, c] of run.cells) {
      const key = `${r}-${c}`;
      if (!cellRuns.has(key)) cellRuns.set(key, []);
      cellRuns.get(key)!.push(run);
    }
  }

  // Collect white cells in order
  const whiteCells: [number, number][] = [];
  for (let r = 1; r < size; r++)
    for (let c = 1; c < size; c++)
      if (!isBlack[r][c]) whiteCells.push([r, c]);

  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  let steps = 0;
  const MAX = 100000;

  function fill(idx: number): boolean {
    if (++steps > MAX) return false;
    if (idx >= whiteCells.length) return true;
    const [r, c] = whiteCells[idx];
    const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const d of digits) {
      if (isValidDigit(grid, cellRuns, r, c, d)) {
        grid[r][c] = d;
        if (fill(idx + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  if (!fill(0)) return null;

  // Compute clues
  const clueMap = new Map<string, KakuroClue>();
  for (const run of runs) {
    const sum = run.cells.reduce((s, [r, c]) => s + grid[r][c], 0);
    const [fr, fc] = run.cells[0];
    const isH = run.cells.length > 1 && run.cells[1][0] === fr;
    const clueR = isH ? fr : fr - 1;
    const clueC = isH ? fc - 1 : fc;
    const key = `${clueR}-${clueC}`;
    if (!clueMap.has(key)) clueMap.set(key, { row: clueR, col: clueC });
    const clue = clueMap.get(key)!;
    if (isH) clue.across = sum;
    else clue.down = sum;
  }

  return {
    size,
    isBlack,
    solution: grid.map((r) => [...r]),
    clues: Array.from(clueMap.values()),
  };
}

function runLen(isBlack: boolean[][], r: number, c: number, dr: number, dc: number, size: number): number {
  let len = 0;
  let rr = r, cc = c;
  while (rr >= 0 && rr < size && cc >= 0 && cc < size && !isBlack[rr][cc]) {
    len++;
    rr += dr;
    cc += dc;
  }
  return len;
}

function findRuns(isBlack: boolean[][], size: number): Run[] {
  const runs: Run[] = [];
  // Horizontal
  for (let r = 0; r < size; r++) {
    let cells: [number, number][] = [];
    for (let c = 0; c < size; c++) {
      if (!isBlack[r][c]) {
        cells.push([r, c]);
      } else {
        if (cells.length >= 2) runs.push({ cells: [...cells] });
        cells = [];
      }
    }
    if (cells.length >= 2) runs.push({ cells: [...cells] });
  }
  // Vertical
  for (let c = 0; c < size; c++) {
    let cells: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      if (!isBlack[r][c]) {
        cells.push([r, c]);
      } else {
        if (cells.length >= 2) runs.push({ cells: [...cells] });
        cells = [];
      }
    }
    if (cells.length >= 2) runs.push({ cells: [...cells] });
  }
  return runs;
}

function isValidDigit(
  grid: number[][],
  cellRuns: Map<string, Run[]>,
  row: number,
  col: number,
  digit: number
): boolean {
  const runs = cellRuns.get(`${row}-${col}`) || [];
  for (const run of runs) {
    for (const [r, c] of run.cells) {
      if (r === row && c === col) continue;
      if (grid[r][c] === digit) return false;
    }
  }
  return true;
}
