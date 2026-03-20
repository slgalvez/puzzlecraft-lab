import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import { WORDS } from "../wordList";
import { analyzeGrid, scoreGridLayout, selectBestCandidate } from "./layoutScoring";

export interface GeneratedFillIn {
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];
  solution: (string | null)[][];
}

const SIZES: Record<Difficulty, number> = { easy: 7, medium: 9, hard: 13, extreme: 15, insane: 19 };
const TARGETS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 18, extreme: 28, insane: 40 };
const MIN_PLACED: Record<Difficulty, number> = { easy: 3, medium: 6, hard: 10, extreme: 16, insane: 24 };
const CANDIDATES: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5, extreme: 3, insane: 3 };

export function generateWordFillIn(seed: number, difficulty: Difficulty): GeneratedFillIn {
  const minPlaced = MIN_PLACED[difficulty];
  const candidates = CANDIDATES[difficulty];

  return selectBestCandidate(
    (s) => {
      const result = buildWordFillIn(s, difficulty);
      if (result.entries.length < minPlaced) {
        return { data: result, score: result.entries.length * 2 };
      }
      const grid = solutionToLetterGrid(result.solution, result.gridSize);
      const placed = extractPlaced(grid, result.gridSize);
      const stats = analyzeGrid(grid, result.gridSize, placed);
      const score = scoreGridLayout(stats, result.entries.length, TARGETS[difficulty]);
      return { data: result, score };
    },
    seed,
    candidates,
    2,
    45
  );
}

export function generateNumberFillIn(seed: number, difficulty: Difficulty): GeneratedFillIn {
  const minPlaced = MIN_PLACED[difficulty];
  const candidates = CANDIDATES[difficulty];

  return selectBestCandidate(
    (s) => {
      const result = buildNumberFillIn(s, difficulty);
      if (result.entries.length < minPlaced) {
        return { data: result, score: result.entries.length * 2 };
      }
      const grid = solutionToLetterGrid(result.solution, result.gridSize);
      const placed = extractPlaced(grid, result.gridSize);
      const stats = analyzeGrid(grid, result.gridSize, placed);
      const score = scoreGridLayout(stats, result.entries.length, TARGETS[difficulty]);
      return { data: result, score };
    },
    seed,
    candidates,
    2,
    45
  );
}

// ── Helpers ──

function solutionToLetterGrid(solution: (string | null)[][], size: number): string[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => solution[r][c] || "")
  );
}

/** Extract placed word entries from a filled grid for scoring purposes. */
function extractPlaced(grid: string[][], size: number): { row: number; col: number; dir: "across" | "down"; word: string }[] {
  const result: { row: number; col: number; dir: "across" | "down"; word: string }[] = [];
  // Across
  for (let r = 0; r < size; r++) {
    let start = -1;
    for (let c = 0; c <= size; c++) {
      if (c < size && grid[r][c]) {
        if (start === -1) start = c;
      } else {
        if (start !== -1 && c - start >= 2) {
          const word = grid[r].slice(start, c).join("");
          result.push({ row: r, col: start, dir: "across", word });
        }
        start = -1;
      }
    }
  }
  // Down
  for (let c = 0; c < size; c++) {
    let start = -1;
    for (let r = 0; r <= size; r++) {
      if (r < size && grid[r][c]) {
        if (start === -1) start = r;
      } else {
        if (start !== -1 && r - start >= 2) {
          let word = "";
          for (let i = start; i < r; i++) word += grid[i][c];
          result.push({ row: start, col: c, dir: "down", word });
        }
        start = -1;
      }
    }
  }
  return result;
}

// ── Core builders (unchanged logic) ──

function buildWordFillIn(seed: number, difficulty: Difficulty): GeneratedFillIn {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const target = TARGETS[difficulty];

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const available = rng.shuffle(WORDS.filter((w) => w.length >= 3 && w.length <= size - 2));

  const placed: { word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  if (available.length > 0) {
    const word = available[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ word, row, col, dir: "across" });
  }

  for (let i = 1; i < available.length && placed.length < target; i++) {
    const word = available[i];
    if (placed.some((p) => p.word === word)) continue;
    const result = findPlacement(grid, word, placed, size, rng);
    if (result) {
      writeWord(grid, word, result.row, result.col, result.dir);
      placed.push({ word, row: result.row, col: result.col, dir: result.dir });
    }
  }

  const blackCells: [number, number][] = [];
  const solution: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        solution[r][c] = grid[r][c];
      } else {
        blackCells.push([r, c]);
      }
    }
  }

  return {
    gridSize: size,
    blackCells,
    entries: placed.map((p) => p.word),
    solution,
  };
}

function buildNumberFillIn(seed: number, difficulty: Difficulty): GeneratedFillIn {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const target = TARGETS[difficulty];

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));

  const entries: string[] = [];
  for (let i = 0; i < target * 3; i++) {
    const len = rng.nextInt(3, Math.min(size - 2, 7));
    const num = Array.from({ length: len }, () => rng.nextInt(1, 9).toString()).join("");
    if (!entries.includes(num)) entries.push(num);
  }

  const placed: { word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  if (entries.length > 0) {
    const word = entries[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ word, row, col, dir: "across" });
  }

  for (let i = 1; i < entries.length && placed.length < target; i++) {
    const word = entries[i];
    const result = findPlacement(grid, word, placed, size, rng);
    if (result) {
      writeWord(grid, word, result.row, result.col, result.dir);
      placed.push({ word, row: result.row, col: result.col, dir: result.dir });
    }
  }

  const blackCells: [number, number][] = [];
  const solution: (string | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        solution[r][c] = grid[r][c];
      } else {
        blackCells.push([r, c]);
      }
    }
  }

  return {
    gridSize: size,
    blackCells,
    entries: placed.map((p) => p.word),
    solution,
  };
}

function writeWord(grid: string[][], word: string, row: number, col: number, dir: "across" | "down") {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

function findPlacement(
  grid: string[][],
  word: string,
  placed: { word: string; row: number; col: number; dir: "across" | "down" }[],
  size: number,
  rng: SeededRandom
): { row: number; col: number; dir: "across" | "down" } | null {
  const shuffled = rng.shuffle([...placed]);
  for (const existing of shuffled) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < existing.word.length; j++) {
        if (word[i] !== existing.word[j]) continue;
        const newDir: "across" | "down" = existing.dir === "across" ? "down" : "across";
        let nr: number, nc: number;
        if (newDir === "down") { nr = existing.row - i; nc = existing.col + j; }
        else { nr = existing.row + j; nc = existing.col - i; }
        if (canPlace(grid, word, nr, nc, newDir, size)) return { row: nr, col: nc, dir: newDir };
      }
    }
  }
  return null;
}

function canPlace(grid: string[][], word: string, row: number, col: number, dir: "across" | "down", size: number): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  if (row < 0 || col < 0 || row + dr * (word.length - 1) >= size || col + dc * (word.length - 1) >= size) return false;
  const pR = row - dr, pC = col - dc;
  if (pR >= 0 && pC >= 0 && grid[pR][pC]) return false;
  const aR = row + dr * word.length, aC = col + dc * word.length;
  if (aR < size && aC < size && grid[aR][aC]) return false;

  let ints = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    if (grid[r][c]) {
      if (grid[r][c] !== word[i]) return false;
      ints++;
    } else {
      if (dir === "across") {
        if (r > 0 && grid[r - 1][c]) return false;
        if (r < size - 1 && grid[r + 1][c]) return false;
      } else {
        if (c > 0 && grid[r][c - 1]) return false;
        if (c < size - 1 && grid[r][c + 1]) return false;
      }
    }
  }
  return ints > 0;
}
