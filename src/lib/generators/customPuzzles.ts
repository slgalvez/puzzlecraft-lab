/**
 * Custom puzzle generators for crafted puzzles.
 *
 * Uses the SAME core logic as the standard gameplay generators:
 * - Same placement rules (writeWord, canPlace, findPlacement from fillGen/crosswordGen)
 * - Same grid sizes per difficulty (matching SIZES maps in fillGen.ts)
 * - Full difficulty range: easy → insane
 * - User words are NEVER dropped silently — grid grows until all fit
 */

import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import {
  tryGenerateWordSearch,
  validateWordSearchGrid,
  type WordSearchPuzzle,
} from "./wordSearch";
import { analyzeGrid, scoreGridLayout, selectBestCandidate } from "./layoutScoring";

// ═══════════════════════════════════════════════
// Grid sizes matching standard gameplay generators
// (from fillGen.ts and crosswordGen.ts)
// ═══════════════════════════════════════════════

const FILL_SIZES: Record<Difficulty, number> = { easy: 7, medium: 9, hard: 13, extreme: 15, insane: 19 };
const XWORD_SIZES: Record<Difficulty, number> = { easy: 9, medium: 13, hard: 15, extreme: 19, insane: 21 };
const FILL_TARGETS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 18, extreme: 28, insane: 40 };

const WS_SIZES: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 16, extreme: 20, insane: 22 };
const WS_WORD_COUNTS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 16, extreme: 22, insane: 28 };
const WS_MIN_WORD_LEN: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5, extreme: 5, insane: 5 };

// ═══════════════════════════════════════════════
// Placement engine — same logic as fillGen.ts / crosswordGen.ts
// ═══════════════════════════════════════════════

function writeWord(grid: string[][], word: string, row: number, col: number, dir: "across" | "down") {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}

/**
 * canPlace — identical to fillGen.ts / crosswordGen.ts canPlace.
 * Checks bounds, before/after gaps, perpendicular isolation, and intersection validity.
 */
function canPlace(grid: string[][], word: string, row: number, col: number, dir: "across" | "down", size: number): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  if (row < 0 || col < 0 || row + dr * (word.length - 1) >= size || col + dc * (word.length - 1) >= size) return false;

  const pR = row - dr, pC = col - dc;
  if (pR >= 0 && pC >= 0 && grid[pR][pC]) return false;

  const aR = row + dr * word.length, aC = col + dc * word.length;
  if (aR < size && aC < size && grid[aR][aC]) return false;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    if (grid[r][c]) {
      if (grid[r][c] !== word[i]) return false;
      intersections++;
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
  return intersections > 0;
}

/**
 * findPlacement — same algorithm as fillGen.ts / crosswordGen.ts.
 * Tries all character intersections between new word and existing placed words.
 */
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

/**
 * findOpenPlacement — fallback when no intersection exists.
 * Finds the best non-intersecting position that balances the grid.
 */
function findOpenPlacement(
  grid: string[][],
  word: string,
  size: number,
  rng: SeededRandom
): { row: number; col: number; dir: "across" | "down" } | null {
  // Compute center of mass of existing content
  let comR = 0, comC = 0, wCount = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) { comR += r; comC += c; wCount++; }
  if (wCount > 0) { comR /= wCount; comC /= wCount; }
  const center = (size - 1) / 2;

  type Candidate = { row: number; col: number; dir: "across" | "down"; score: number };
  let best: Candidate | null = null;

  for (const dir of ["across", "down"] as const) {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    const maxRow = dir === "across" ? size - 1 : size - word.length;
    const maxCol = dir === "across" ? size - word.length : size - 1;

    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        // Check if placement is valid (no conflicts, allow 0 intersections)
        if (row + dr * (word.length - 1) >= size) continue;
        if (col + dc * (word.length - 1) >= size) continue;

        // Before/after must be empty
        const pR = row - dr, pC = col - dc;
        if (pR >= 0 && pC >= 0 && grid[pR][pC]) continue;
        const aR = row + dr * word.length, aC = col + dc * word.length;
        if (aR < size && aC < size && grid[aR][aC]) continue;

        let valid = true;
        let crowding = 0;
        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i, c = col + dc * i;
          if (grid[r][c]) { valid = false; break; }
          // Check perpendicular neighbors
          if (dir === "across") {
            if (r > 0 && grid[r - 1][c]) { valid = false; break; }
            if (r < size - 1 && grid[r + 1][c]) { valid = false; break; }
          } else {
            if (c > 0 && grid[r][c - 1]) { valid = false; break; }
            if (c < size - 1 && grid[r][c + 1]) { valid = false; break; }
          }
          // Count nearby occupied cells for crowding penalty
          for (let nr = r - 1; nr <= r + 1; nr++)
            for (let nc = c - 1; nc <= c + 1; nc++)
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc]) crowding++;
        }
        if (!valid) continue;

        // Score: prefer positions that balance the grid
        const midR = row + dr * (word.length - 1) / 2;
        const midC = col + dc * (word.length - 1) / 2;
        const currentDist = Math.abs(comR - center) + Math.abs(comC - center);
        const newComR = (comR * wCount + midR * word.length) / Math.max(1, wCount + word.length);
        const newComC = (comC * wCount + midC * word.length) / Math.max(1, wCount + word.length);
        const newDist = Math.abs(newComR - center) + Math.abs(newComC - center);
        const balance = currentDist - newDist;

        const score = balance * 8 - crowding * 1.5;
        if (!best || score > best.score) {
          best = { row, col, dir, score };
        }
      }
    }
  }

  return best;
}

// ═══════════════════════════════════════════════
// Grid trimming
// ═══════════════════════════════════════════════

function trimGrid<T extends { row: number; col: number }>(
  grid: string[][],
  size: number,
  placed: T[]
): { grid: string[][]; size: number; placed: T[] } {
  let minR = size, maxR = 0, minC = size, maxC = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
  if (minR > maxR) return { grid, size, placed };

  minR = Math.max(0, minR - 1);
  maxR = Math.min(size - 1, maxR + 1);
  minC = Math.max(0, minC - 1);
  maxC = Math.min(size - 1, maxC + 1);

  const h = maxR - minR + 1, w = maxC - minC + 1;
  const newSize = Math.max(h, w);
  const rowPad = Math.floor((newSize - h) / 2);
  const colPad = Math.floor((newSize - w) / 2);
  const offR = minR - rowPad;
  const offC = minC - colPad;

  const newGrid: string[][] = Array.from({ length: newSize }, () => Array(newSize).fill(""));
  for (let r = 0; r < newSize; r++)
    for (let c = 0; c < newSize; c++) {
      const or = r + offR, oc = c + offC;
      if (or >= 0 && or < size && oc >= 0 && oc < size) newGrid[r][c] = grid[or][oc];
    }

  const newPlaced = placed.map(p => ({ ...p, row: p.row - offR, col: p.col - offC }));
  return { grid: newGrid, size: newSize, placed: newPlaced };
}

// ═══════════════════════════════════════════════
// Custom Word Fill-In
// ═══════════════════════════════════════════════

export interface CustomFillInData {
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];
  solution: (string | null)[][];
}

/**
 * Generates a custom word fill-in using the SAME placement logic as fillGen.ts.
 * The Create UI still exposes only easy/medium/hard, but generation can grow
 * up to the standard insane board capacity before it gives up.
 */
export function generateCustomFillIn(words: string[], difficulty: Difficulty = "medium"): CustomFillInData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  if (maxLen > FILL_SIZES.insane) {
    throw new Error(`Word Fill-In supports words up to ${FILL_SIZES.insane} letters.`);
  }

  const wordCount = cleaned.length;
  const standardSize = FILL_SIZES[difficulty];
  const baseSize = Math.max(standardSize, maxLen);
  const maxSize = FILL_SIZES.insane;
  const baseSeed = Date.now() % 2147483646 || 1;

  let bestOverall: { data: CustomFillInData; placedCount: number } | null = null;

  for (let size = baseSize; size <= maxSize; size++) {
    const target = Math.min(wordCount, FILL_TARGETS[difficulty] || wordCount);

    const result = selectBestCandidate(
      (seed) => {
        const built = buildFillIn(cleaned, size, seed);
        if (built.placedCount === wordCount) {
          const grid = solutionToLetterGrid(built.data.solution, built.data.gridSize);
          const placedEntries = extractPlacedEntries(grid, built.data.gridSize);
          const stats = analyzeGrid(grid, built.data.gridSize, placedEntries);
          const layoutScore = scoreGridLayout(stats, built.placedCount, target);
          return { data: built.data, score: layoutScore + 1000 };
        }
        return { data: built.data, score: built.placedCount * 2 };
      },
      (baseSeed + size * 3571) % 2147483646 || 1,
      5,
      3,
      50
    );

    const placedCount = result.entries.length;
    if (!bestOverall || placedCount > bestOverall.placedCount) {
      bestOverall = { data: result, placedCount };
    }

    if (placedCount === wordCount) return result;
  }

  return bestOverall!.data;
}

function solutionToLetterGrid(solution: (string | null)[][], size: number): string[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => solution[r][c] || "")
  );
}

function extractPlacedEntries(grid: string[][], size: number): { row: number; col: number; dir: "across" | "down"; word: string }[] {
  const result: { row: number; col: number; dir: "across" | "down"; word: string }[] = [];
  for (let r = 0; r < size; r++) {
    let start = -1;
    for (let c = 0; c <= size; c++) {
      if (c < size && grid[r][c]) { if (start === -1) start = c; }
      else {
        if (start !== -1 && c - start >= 2) {
          result.push({ row: r, col: start, dir: "across", word: grid[r].slice(start, c).join("") });
        }
        start = -1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let start = -1;
    for (let r = 0; r <= size; r++) {
      if (r < size && grid[r][c]) { if (start === -1) start = r; }
      else {
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

function buildFillIn(words: string[], size: number, seed: number) {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { id: number; word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Sort: longest first for structural anchoring, with shuffle for variety
  const sorted = rng
    .shuffle(words.map((word, id) => ({ word, id })))
    .sort((a, b) => b.word.length - a.word.length);

  // Place first word centered horizontally
  if (sorted.length > 0) {
    const { word, id } = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ id, word, row, col, dir: "across" });
  }

  // Multiple passes — same approach as fillGen.ts
  const passes = words.length > 15 ? 5 : words.length > 8 ? 4 : 3;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 1; i < sorted.length; i++) {
      const { word, id } = sorted[i];
      if (placed.some(p => p.id === id)) continue;

      // Try intersection-based placement first (same as fillGen.ts findPlacement)
      const result = findPlacement(grid, word, placed, size, rng);
      if (result) {
        writeWord(grid, word, result.row, result.col, result.dir);
        placed.push({ id, word, row: result.row, col: result.col, dir: result.dir });
        continue;
      }

      // Fallback: open placement (no intersection required)
      const open = findOpenPlacement(grid, word, size, rng);
      if (open) {
        writeWord(grid, word, open.row, open.col, open.dir);
        placed.push({ id, word, row: open.row, col: open.col, dir: open.dir });
      }
    }
  }

  // Trim to compact grid
  const trimmed = trimGrid(grid, size, placed);

  const blackCells: [number, number][] = [];
  const solution: (string | null)[][] = Array.from({ length: trimmed.size }, () => Array(trimmed.size).fill(null));
  for (let r = 0; r < trimmed.size; r++)
    for (let c = 0; c < trimmed.size; c++)
      if (trimmed.grid[r][c]) solution[r][c] = trimmed.grid[r][c];
      else blackCells.push([r, c]);

  return {
    data: { gridSize: trimmed.size, blackCells, entries: trimmed.placed.map(p => p.word), solution } as CustomFillInData,
    placedCount: placed.length,
  };
}

// ═══════════════════════════════════════════════
// Custom Cryptogram
// ═══════════════════════════════════════════════

export interface CustomCryptogramData {
  encoded: string;
  decoded: string;
  cipher: Record<string, string>;
  reverseCipher: Record<string, string>;
  hints: Record<string, string>;
}

export function generateCustomCryptogram(phrase: string, difficulty: Difficulty = "medium"): CustomCryptogramData {
  const normalized = phrase
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"');
  const decoded = normalized.toUpperCase().replace(/[^A-Z .,!?;:'"()-]/g, "");
  if (decoded.replace(/[^A-Z]/g, "").length < 3) throw new Error("Phrase too short");

  const rng = new SeededRandom(Date.now() % 2147483646 || 1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let shuffled: string[];
  let attempts = 0;
  do {
    shuffled = rng.shuffle([...alphabet]);
    attempts++;
  } while (shuffled.some((c, i) => c === alphabet[i]) && attempts < 100);

  const cipher: Record<string, string> = {};
  const reverseCipher: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    cipher[alphabet[i]] = shuffled[i];
    reverseCipher[shuffled[i]] = alphabet[i];
  }

  const encoded = decoded.split("").map(ch => cipher[ch] || ch).join("");

  // Hint count scales with difficulty
  const hintCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 2 : difficulty === "hard" ? 1 : 0;
  const uniqueLetters = [...new Set(decoded.split("").filter(ch => /[A-Z]/.test(ch)))];

  const letterFreq = uniqueLetters.map(l => ({
    letter: l,
    count: decoded.split("").filter(ch => ch === l).length,
  })).sort((a, b) => b.count - a.count);

  const hintLetters = difficulty === "easy"
    ? letterFreq.slice(0, hintCount).map(l => l.letter)
    : rng.shuffle(uniqueLetters).slice(0, hintCount);

  const hints: Record<string, string> = {};
  for (const letter of hintLetters) {
    hints[cipher[letter]] = letter;
  }

  return { encoded, decoded, cipher, reverseCipher, hints };
}

// ═══════════════════════════════════════════════
// Custom Crossword
// ═══════════════════════════════════════════════

export interface CustomCrosswordData {
  gridSize: number;
  blackCells: [number, number][];
  clues: { number: number; clue: string; answer: string; row: number; col: number; direction: "across" | "down" }[];
}

/**
 * Generates a custom crossword using the same placement logic as crosswordGen.ts.
 * Grid grows until all entries are placed.
 */
export function generateCustomCrossword(entries: { answer: string; clue: string }[], difficulty: Difficulty = "medium"): CustomCrosswordData {
  const cleaned = entries
    .map(e => ({ answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: e.clue.trim() }))
    .filter(e => e.answer.length >= 2 && e.clue.length > 0);
  if (cleaned.length === 0) throw new Error("No valid entries");

  const maxLen = Math.max(...cleaned.map(e => e.answer.length));
  const wordCount = cleaned.length;

  const standardSize = XWORD_SIZES[difficulty];
  const minSizeForWords = maxLen + 2;
  const baseSize = Math.max(standardSize, minSizeForWords);
  const maxSize = Math.max(baseSize + 12, 25);
  const baseSeed = Date.now() % 2147483646 || 1;

  let bestOverall: { data: CustomCrosswordData; placedCount: number } | null = null;

  for (let size = baseSize; size <= maxSize; size++) {
    const result = selectBestCandidate(
      (seed) => {
        const built = buildCrossword(cleaned, size, seed);
        if (built.placedCount === wordCount) {
          const grid = reconstructCrosswordGrid(built.data);
          const placedArr = built.data.clues.map(c => ({
            row: c.row, col: c.col, dir: c.direction, word: c.answer,
          }));
          const stats = analyzeGrid(grid, built.data.gridSize, placedArr);
          const layoutScore = scoreGridLayout(stats, built.placedCount, wordCount);
          return { data: built.data, score: layoutScore + 1000 };
        }
        return { data: built.data, score: built.placedCount * 2 };
      },
      (baseSeed + size * 3571) % 2147483646 || 1,
      5, 3, 50
    );

    const placedCount = (result as CustomCrosswordData).clues.length;
    if (!bestOverall || placedCount > bestOverall.placedCount) {
      bestOverall = { data: result, placedCount };
    }
    if (placedCount === wordCount) return result;
  }

  return bestOverall!.data;
}

function reconstructCrosswordGrid(data: CustomCrosswordData): string[][] {
  const grid: string[][] = Array.from({ length: data.gridSize }, () => Array(data.gridSize).fill(""));
  for (const clue of data.clues) {
    const dr = clue.direction === "down" ? 1 : 0;
    const dc = clue.direction === "across" ? 1 : 0;
    for (let i = 0; i < clue.answer.length; i++) {
      grid[clue.row + dr * i][clue.col + dc * i] = clue.answer[i];
    }
  }
  return grid;
}

function buildCrossword(
  entries: { answer: string; clue: string }[],
  size: number,
  seed: number
) {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[] = [];

  const sorted = rng.shuffle([...entries]).sort((a, b) => b.answer.length - a.answer.length);

  if (sorted.length > 0) {
    const { answer, clue } = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - answer.length) / 2);
    writeWord(grid, answer, row, col, "across");
    placed.push({ word: answer, clue, row, col, dir: "across" });
  }

  const passes = entries.length > 15 ? 5 : entries.length > 8 ? 4 : 3;
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 1; i < sorted.length; i++) {
      const { answer, clue } = sorted[i];
      if (placed.some(p => p.word === answer)) continue;
      const result = findPlacement(grid, answer, placed, size, rng);
      if (result) {
        writeWord(grid, answer, result.row, result.col, result.dir);
        placed.push({ word: answer, clue, row: result.row, col: result.col, dir: result.dir });
      }
    }
  }

  const trimmed = trimGrid(grid, size, placed);

  const blackCells: [number, number][] = [];
  for (let r = 0; r < trimmed.size; r++)
    for (let c = 0; c < trimmed.size; c++)
      if (!trimmed.grid[r][c]) blackCells.push([r, c]);

  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const numbers = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < trimmed.size; r++) {
    for (let c = 0; c < trimmed.size; c++) {
      if (blackSet.has(`${r}-${c}`)) continue;
      const startsAcross = (c === 0 || blackSet.has(`${r}-${c - 1}`)) && c + 1 < trimmed.size && !blackSet.has(`${r}-${c + 1}`);
      const startsDown = (r === 0 || blackSet.has(`${r - 1}-${c}`)) && r + 1 < trimmed.size && !blackSet.has(`${r + 1}-${c}`);
      if (startsAcross || startsDown) numbers.set(`${r}-${c}`, num++);
    }
  }

  const clues = trimmed.placed.map(p => ({
    number: numbers.get(`${p.row}-${p.col}`) || 0,
    clue: p.clue || "",
    answer: p.word,
    row: p.row,
    col: p.col,
    direction: p.dir,
  }));

  return {
    data: { gridSize: trimmed.size, blackCells, clues } as CustomCrosswordData,
    placedCount: placed.length,
  };
}

// ═══════════════════════════════════════════════
// Custom Word Search — uses the standard generator
// ═══════════════════════════════════════════════

export interface CustomWordSearchData {
  grid: string[][];
  words: string[];
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
}

const MAX_CRAFT_WS_ATTEMPTS = 30;

function getDeterministicSeed(parts: string[]): number {
  let hash = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      hash ^= part.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return (hash >>> 0) % 2147483646 || 1;
}

/**
 * Uses the exact standard word-search generator path.
 * The Create UI stays easy/medium/hard, and the selected difficulty directly
 * controls the same board size, word-count budget, and filler complexity as normal gameplay.
 */
export function generateCustomWordSearch(words: string[], difficulty: Difficulty = "medium"): CustomWordSearchData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  const minLen = Math.min(...cleaned.map(w => w.length));
  const sizeLimit = WS_SIZES[difficulty];
  const wordLimit = WS_WORD_COUNTS[difficulty];
  const minWordLen = WS_MIN_WORD_LEN[difficulty];

  if (maxLen > sizeLimit) {
    throw new Error(`${difficulty[0].toUpperCase() + difficulty.slice(1)} word search supports words up to ${sizeLimit} letters.`);
  }
  if (minLen < minWordLen) {
    throw new Error(`${difficulty[0].toUpperCase() + difficulty.slice(1)} word search needs words with at least ${minWordLen} letters.`);
  }
  if (cleaned.length > wordLimit) {
    throw new Error(`${difficulty[0].toUpperCase() + difficulty.slice(1)} word search fits up to ${wordLimit} words. Remove a few words or change the layout.`);
  }

  const seed = getDeterministicSeed([difficulty, ...cleaned.slice().sort()]);

  let bestResult: WordSearchPuzzle | null = null;
  let bestPlacedCount = 0;

  for (let attempt = 0; attempt < MAX_CRAFT_WS_ATTEMPTS; attempt++) {
    const result = tryGenerateWordSearch(seed + attempt * 7919, difficulty, cleaned);
    if (!validateWordSearchGrid(result)) continue;

    if (result.words.length > bestPlacedCount) {
      bestPlacedCount = result.words.length;
      bestResult = result;
    }

    if (result.words.length === cleaned.length) {
      return result as CustomWordSearchData;
    }
  }

  throw new Error(`This ${difficulty} word search could not fit all ${cleaned.length} words cleanly. Remove a few words or shorten them.`);
}
