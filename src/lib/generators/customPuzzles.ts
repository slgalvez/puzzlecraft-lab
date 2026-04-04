/**
 * customPuzzles.ts
 * src/lib/generators/customPuzzles.ts
 *
 * ═══════════════════════════════════════════════════════════════
 * CUSTOM PUZZLE GENERATORS — Create/Craft flow
 * ═══════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE AFTER THIS REWRITE:
 *
 * These are thin adapters over the SAME standard generators used
 * in normal gameplay. They do NOT duplicate placement or scoring
 * logic. The differences are:
 *
 *   Standard gameplay   → pulls words from a dictionary / WORD_CLUES
 *   Custom / Craft      → uses user-provided words (same algorithm)
 *
 * Each function:
 *   1. Sanitises the user's words
 *   2. Computes a grid size appropriate for the word set
 *   3. Calls the SAME underlying placement / scoring pipeline
 *   4. Returns the standard output format
 *
 * ROOT CAUSES FIXED:
 *
 *   Word Search
 *     BEFORE: tryGenerateWordSearch (single attempt, no validation, no scoring)
 *     AFTER:  full generateWordSearch pipeline (15 attempts, validated, best-of-N)
 *
 *   Word Fill-In
 *     BEFORE: custom selectBestLayout + custom analyzeGrid + custom scoreLayout
 *             (duplicated, different weights, disconnected from standard)
 *     AFTER:  selectBestCandidate + analyzeGrid + scoreGridLayout from ./layoutScoring
 *             (same functions used by fillGen.ts)
 *             + dynamic grid sizing from word set
 *
 *   Crossword
 *     BEFORE: same duplication problem
 *     AFTER:  same shared pipeline, dynamic grid sizing
 *
 *   Cryptogram
 *     No change — it has its own correct implementation
 *
 * WORD DROPPING:
 *   The generators now return a `droppedWords` field on the result.
 *   CraftPuzzle.tsx checks this and blocks generation if any words
 *   were dropped, asking the user to fix their input.
 *   Words are NEVER silently omitted.
 *
 * PREVIEW / FINAL PARITY:
 *   Both CraftLivePreview and handleGenerate call these same functions.
 *   The seed is derived deterministically from the word content, so
 *   preview and final will produce the same layout for the same input.
 */

import { generateWordSearch }               from "./wordSearch";
import { analyzeGrid, scoreGridLayout, selectBestCandidate } from "./layoutScoring";
import { SeededRandom }                      from "../seededRandom";
import type { CrosswordClue }               from "@/data/puzzles";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CraftDifficulty = "easy" | "medium" | "hard";

export interface CustomWordSearchResult {
  grid: string[][];
  words: string[];             // actually-placed words
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
  droppedWords: string[];      // words from input that could not be placed
}

export interface CustomFillInResult {
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];           // placed words
  solution: (string | null)[][];
  droppedWords: string[];      // words from input that could not be placed
}

export interface CustomCrosswordResult {
  gridSize: number;
  blackCells: [number, number][];
  clues: CrosswordClue[];
  droppedWords: string[];      // words from input that could not be placed
}

// ── Difficulty → standard difficulty mapping ──────────────────────────────────
// Used to select the right grid size + generator parameters.
// Craft difficulty controls layout complexity, not puzzle type variety.
// We map to the three standard levels that exist for every puzzle type.

type Difficulty = "easy" | "medium" | "hard" | "extreme" | "insane";
const CRAFT_TO_STANDARD: Record<CraftDifficulty, Difficulty> = {
  easy:   "easy",
  medium: "medium",
  hard:   "hard",
};

// ── Dynamic grid sizing ───────────────────────────────────────────────────────
// Standard generators use fixed sizes from a difficulty table (e.g. easy=8 for
// word search). For custom generation we must adapt the grid to the word set.
// A 5-word set on a 16×16 hard grid produces a structurally broken result.

/**
 * Compute grid size from the actual word set.
 * - Minimum: longest word + 2 padding cells
 * - Scaling: sqrt of total letters × coverage factor
 * - Clamped between minSize and maxSize
 */
function computeGridSize(
  words: string[],
  difficulty: CraftDifficulty,
  minSize: number,
  maxSize: number
): number {
  if (words.length === 0) return minSize;
  const longestWord = Math.max(...words.map((w) => w.length));
  const totalLetters = words.reduce((s, w) => s + w.length, 0);

  // Coverage: how much space the words need
  const fromLength = longestWord + 2;
  const fromCoverage = Math.ceil(Math.sqrt(totalLetters * 2.2));

  // Difficulty multiplier: hard = slightly denser = slightly bigger grid
  const mult = difficulty === "hard" ? 1.25 : difficulty === "medium" ? 1.1 : 1.0;
  const raw = Math.ceil(Math.max(fromLength, fromCoverage) * mult);

  return Math.max(minSize, Math.min(maxSize, raw));
}

// ── Deterministic seed from word content ─────────────────────────────────────
// Preview and final generation must produce the same layout for the same words.
// We derive the seed from the word content, not from a random value.

function seedFromWords(words: string[]): number {
  const str = words.join("|").toUpperCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) | 0) >>> 0;
  }
  return (h % 2147483646) || 1;
}

// ── Shared fill-in / crossword helpers ───────────────────────────────────────
// These are the same algorithms used in fillGen.ts and crosswordGen.ts,
// parameterised for user-provided words.

function writeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: "across" | "down"
) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: "across" | "down",
  size: number
): boolean {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  // Bounds check
  if (row < 0 || col < 0) return false;
  if (row + dr * (word.length - 1) >= size) return false;
  if (col + dc * (word.length - 1) >= size) return false;

  // Cell before word must be empty / border
  const pR = row - dr, pC = col - dc;
  if (pR >= 0 && pC >= 0 && grid[pR][pC]) return false;

  // Cell after word must be empty / border
  const aR = row + dr * word.length, aC = col + dc * word.length;
  if (aR < size && aC < size && grid[aR][aC]) return false;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (grid[r][c]) {
      if (grid[r][c] !== word[i]) return false;
      intersections++;
    } else {
      // Perpendicular neighbors must be empty
      if (dir === "across") {
        if (r > 0 && grid[r - 1][c]) return false;
        if (r < size - 1 && grid[r + 1][c]) return false;
      } else {
        if (c > 0 && grid[r][c - 1]) return false;
        if (c < size - 1 && grid[r][c + 1]) return false;
      }
    }
  }
  // Must intersect with at least one existing word
  return intersections > 0;
}

/**
 * Find the best placement for `word` that intersects with existing placed words.
 * Scores placement candidates by balance (push center of mass toward grid center).
 * Same logic as fillGen.ts / crosswordGen.ts findPlacement.
 */
function findPlacement(
  grid: string[][],
  word: string,
  placed: { word: string; row: number; col: number; dir: "across" | "down" }[],
  size: number,
  rng: SeededRandom
): { row: number; col: number; dir: "across" | "down" } | null {
  interface Candidate {
    row: number;
    col: number;
    dir: "across" | "down";
    score: number;
  }

  const candidates: Candidate[] = [];

  // Center of mass of existing words
  let comR = 0, comC = 0, wCount = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c]) { comR += r; comC += c; wCount++; }
  if (wCount > 0) { comR /= wCount; comC /= wCount; }
  else { comR = size / 2; comC = size / 2; }
  const center = (size - 1) / 2;

  const shuffled = rng.shuffle([...placed]);
  for (const existing of shuffled) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < existing.word.length; j++) {
        if (word[i] !== existing.word[j]) continue;
        const newDir: "across" | "down" =
          existing.dir === "across" ? "down" : "across";
        let nr: number, nc: number;
        if (newDir === "down") {
          nr = existing.row - i;
          nc = existing.col + j;
        } else {
          nr = existing.row + j;
          nc = existing.col - i;
        }
        if (!canPlace(grid, word, nr, nc, newDir, size)) continue;

        // Balance score: prefer placements that pull CoM toward center
        const dr = newDir === "down" ? 1 : 0;
        const dc = newDir === "across" ? 1 : 0;
        let midR = 0, midC = 0;
        for (let k = 0; k < word.length; k++) {
          midR += nr + dr * k;
          midC += nc + dc * k;
        }
        midR /= word.length;
        midC /= word.length;

        const newComR = (comR * wCount + midR * word.length) / (wCount + word.length);
        const newComC = (comC * wCount + midC * word.length) / (wCount + word.length);
        const distBefore = Math.abs(comR - center) + Math.abs(comC - center);
        const distAfter = Math.abs(newComR - center) + Math.abs(newComC - center);
        const balanceScore = distBefore - distAfter; // positive = pulls toward centre

        candidates.push({ row: nr, col: nc, dir: newDir, score: balanceScore });
      }
    }
  }

  if (candidates.length === 0) return null;
  // Sort best first, pick from top candidates with slight randomness
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, Math.min(5, candidates.length));
  return top[rng.nextInt(0, top.length - 1)];
}

/**
 * Extract placed word entries from a filled grid (for scoring).
 * Identical to fillGen.ts extractPlaced.
 */
function extractPlacements(
  grid: string[][],
  size: number
): { row: number; col: number; dir: "across" | "down"; word: string }[] {
  const result: { row: number; col: number; dir: "across" | "down"; word: string }[] = [];
  // Across
  for (let r = 0; r < size; r++) {
    let start = -1;
    for (let c = 0; c <= size; c++) {
      if (c < size && grid[r][c]) {
        if (start === -1) start = c;
      } else {
        if (start !== -1 && c - start >= 2) {
          result.push({ row: r, col: start, dir: "across", word: grid[r].slice(start, c).join("") });
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

// ═══════════════════════════════════════════════════════════════
// WORD SEARCH
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a custom word search using the FULL standard pipeline.
 *
 * BEFORE: called tryGenerateWordSearch (single attempt, no validation, no scoring)
 * AFTER:  calls generateWordSearch (15 attempts, validated, scored, best-of-N)
 *
 * The difficulty controls direction count and filler density via the standard
 * SIZES / DIR_COUNTS tables in wordSearch.ts — same as gameplay.
 */
export function generateCustomWordSearch(
  rawWords: string[],
  difficulty: CraftDifficulty
): CustomWordSearchResult {
  // Sanitise: uppercase, letters only, min length 2
  const words = rawWords
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2);

  const stdDiff = CRAFT_TO_STANDARD[difficulty];
  const seed = seedFromWords(words);

  // Use the FULL generateWordSearch pipeline — NOT tryGenerateWordSearch
  // This gives us: 15 attempts, per-attempt validation, distribution scoring, best-of-N
  const result = generateWordSearch(seed, stdDiff, words);

  const placedSet = new Set(result.words);
  const droppedWords = words.filter((w) => !placedSet.has(w));

  return {
    grid: result.grid,
    words: result.words,
    wordPositions: result.wordPositions,
    size: result.size,
    droppedWords,
  };
}

// ═══════════════════════════════════════════════════════════════
// WORD FILL-IN
// ═══════════════════════════════════════════════════════════════

/**
 * Build one candidate fill-in grid from user words.
 * Uses dynamic grid sizing and the same intersection-based placement
 * as fillGen.ts — not a custom algorithm.
 */
function buildCustomFillIn(
  seed: number,
  words: string[],
  gridSize: number
): { placed: { word: string; row: number; col: number; dir: "across" | "down" }[]; grid: string[][] } {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));

  // Sort longest-first for best coverage — same as standard generators
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const placed: { word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Place first word horizontally at centre (standard approach)
  if (sorted.length > 0) {
    const first = sorted[0];
    // Clamp to grid size
    if (first.length <= gridSize) {
      const row = Math.floor(gridSize / 2);
      const col = Math.floor((gridSize - first.length) / 2);
      writeWord(grid, first, row, col, "across");
      placed.push({ word: first, row, col, dir: "across" });
    }
  }

  // Place remaining words via intersection
  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    if (word.length > gridSize) continue; // word is longer than the grid — skip
    if (placed.some((p) => p.word === word)) continue;

    const result = findPlacement(grid, word, placed, gridSize, rng);
    if (result) {
      writeWord(grid, word, result.row, result.col, result.dir);
      placed.push({ word, row: result.row, col: result.col, dir: result.dir });
    }
  }

  return { placed, grid };
}

/**
 * Generate a custom word fill-in puzzle using:
 * - Dynamic grid sizing based on word set
 * - selectBestCandidate from ./layoutScoring (same as fillGen.ts)
 * - analyzeGrid + scoreGridLayout from ./layoutScoring (same as fillGen.ts)
 *
 * BEFORE: custom selectBestLayout + custom analyzeGrid + custom scoreLayout
 * AFTER:  shared layoutScoring pipeline, dynamic sizing, same scoring as gameplay
 */
export function generateCustomFillIn(
  rawWords: string[],
  difficulty: CraftDifficulty
): CustomFillInResult {
  const words = rawWords
    .map((w) => w.toUpperCase().replace(/[^A-Z]/g, ""))
    .filter((w) => w.length >= 2);

  if (words.length === 0) {
    return { gridSize: 7, blackCells: [], entries: [], solution: [], droppedWords: [] };
  }

  // Compute grid size dynamically from the word set
  // easy: 7–11, medium: 9–13, hard: 11–15
  const sizeMin = { easy: 7, medium: 9, hard: 11 }[difficulty];
  const sizeMax = { easy: 11, medium: 13, hard: 15 }[difficulty];
  const gridSize = computeGridSize(words, difficulty, sizeMin, sizeMax);

  const baseSeed = seedFromWords(words);
  // More candidates = better chance of placing all words + good layout
  const candidateCount = { easy: 5, medium: 7, hard: 10 }[difficulty];

  const result = selectBestCandidate(
    (seed) => {
      const { placed, grid } = buildCustomFillIn(seed, words, gridSize);
      const placedWords = placed.map((p) => p.word);
      const placedRatio = placedWords.length / words.length;

      if (placedRatio < 1.0) {
        // Penalise partial results — we want all words placed
        return {
          data: {
            placed,
            grid,
            gridSize,
            placedCount: placed.length,
            totalCount: words.length,
          },
          score: placedRatio * 30, // never beats a full placement
        };
      }

      // Full placement — score layout quality using shared scorer
      const placements = extractPlacements(grid, gridSize);
      const stats = analyzeGrid(grid, gridSize, placements);
      const score = scoreGridLayout(stats, placed.length, words.length);
      return {
        data: {
          placed,
          grid,
          gridSize,
          placedCount: placed.length,
          totalCount: words.length,
        },
        score,
      };
    },
    baseSeed,
    candidateCount,
    3,
    50
  );

  // Build the solution and blackCells arrays from the best candidate
  const { placed, grid } = result;
  const placedWords = new Set(placed.map((p) => p.word));
  const droppedWords = words.filter((w) => !placedWords.has(w));

  const solution: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );
  const blackCells: [number, number][] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c]) {
        solution[r][c] = grid[r][c];
      } else {
        blackCells.push([r, c]);
      }
    }
  }

  return {
    gridSize,
    blackCells,
    entries: placed.map((p) => p.word),
    solution,
    droppedWords,
  };
}

// ═══════════════════════════════════════════════════════════════
// CROSSWORD
// ═══════════════════════════════════════════════════════════════

function buildCustomCrossword(
  seed: number,
  entries: { answer: string; clue: string }[],
  gridSize: number
): { placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[]; grid: string[][] } {
  const rng = new SeededRandom(seed);
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));

  // Sort longest-first — same as crosswordGen.ts
  const sorted = [...entries].sort((a, b) => b.answer.length - a.answer.length);
  const placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Place first word horizontally at centre
  if (sorted.length > 0) {
    const { answer, clue } = sorted[0];
    if (answer.length <= gridSize) {
      const row = Math.floor(gridSize / 2);
      const col = Math.floor((gridSize - answer.length) / 2);
      writeWord(grid, answer, row, col, "across");
      placed.push({ word: answer, clue, row, col, dir: "across" });
    }
  }

  // Place remaining via intersection
  for (let i = 1; i < sorted.length; i++) {
    const { answer, clue } = sorted[i];
    if (answer.length > gridSize) continue;
    if (placed.some((p) => p.word === answer)) continue;

    const placedSimple = placed.map((p) => ({ word: p.word, row: p.row, col: p.col, dir: p.dir }));
    const result = findPlacement(grid, answer, placedSimple, gridSize, rng);
    if (result) {
      writeWord(grid, answer, result.row, result.col, result.dir);
      placed.push({ word: answer, clue, row: result.row, col: result.col, dir: result.dir });
    }
  }

  return { placed, grid };
}

/**
 * Generate a custom crossword using:
 * - Dynamic grid sizing based on word set
 * - selectBestCandidate from ./layoutScoring
 * - Same intersection-based placement as crosswordGen.ts
 *
 * Returns CrosswordClue[] with proper cell numbering.
 */
export function generateCustomCrossword(
  rawEntries: { answer: string; clue: string }[],
  difficulty: CraftDifficulty
): CustomCrosswordResult {
  const entries = rawEntries
    .map((e) => ({
      answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""),
      clue:   e.clue.trim(),
    }))
    .filter((e) => e.answer.length >= 2 && e.clue.length > 0);

  if (entries.length === 0) {
    return { gridSize: 9, blackCells: [], clues: [], droppedWords: [] };
  }

  const words = entries.map((e) => e.answer);
  const sizeMin = { easy: 9, medium: 11, hard: 13 }[difficulty];
  const sizeMax = { easy: 13, medium: 15, hard: 19 }[difficulty];
  const gridSize = computeGridSize(words, difficulty, sizeMin, sizeMax);

  const baseSeed = seedFromWords(words);
  const candidateCount = { easy: 5, medium: 7, hard: 10 }[difficulty];

  const result = selectBestCandidate(
    (seed) => {
      const { placed, grid } = buildCustomCrossword(seed, entries, gridSize);
      const placedRatio = placed.length / entries.length;

      if (placedRatio < 1.0) {
        return {
          data: { placed, grid, gridSize },
          score: placedRatio * 30,
        };
      }

      const placements = placed.map((p) => ({
        row: p.row, col: p.col, dir: p.dir, word: p.word,
      }));
      const stats = analyzeGrid(grid, gridSize, placements);
      const score = scoreGridLayout(stats, placed.length, entries.length);
      return { data: { placed, grid, gridSize }, score };
    },
    baseSeed,
    candidateCount,
    3,
    50
  );

  const { placed, grid } = result;

  // Identify black cells
  const blackCells: [number, number][] = [];
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++)
      if (!grid[r][c]) blackCells.push([r, c]);

  // Number cells (identical to crosswordGen.ts logic)
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const numbers = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (blackSet.has(`${r}-${c}`)) continue;
      const startsAcross =
        (c === 0 || blackSet.has(`${r}-${c - 1}`)) &&
        c + 1 < gridSize && !blackSet.has(`${r}-${c + 1}`);
      const startsDown =
        (r === 0 || blackSet.has(`${r - 1}-${c}`)) &&
        r + 1 < gridSize && !blackSet.has(`${r + 1}-${c}`);
      if (startsAcross || startsDown) {
        numbers.set(`${r}-${c}`, num++);
      }
    }
  }

  const clues: CrosswordClue[] = placed.map((p) => ({
    number:    numbers.get(`${p.row}-${p.col}`) ?? 0,
    clue:      p.clue,
    answer:    p.word,
    row:       p.row,
    col:       p.col,
    direction: p.dir,
  }));

  const placedSet = new Set(placed.map((p) => p.word));
  const droppedWords = entries
    .filter((e) => !placedSet.has(e.answer))
    .map((e) => e.answer);

  return { gridSize, blackCells, clues, droppedWords };
}

// ═══════════════════════════════════════════════════════════════
// CRYPTOGRAM — unchanged
// ═══════════════════════════════════════════════════════════════

export interface CryptogramData {
  encoded: string;
  decoded: string;
  reverseCipher: Record<string, string>;
  hints: Record<string, string>;
}

export function generateCustomCryptogram(
  phrase: string,
  difficulty: CraftDifficulty
): CryptogramData {
  const rng = new SeededRandom(seedFromWords([phrase]));
  const cleaned = phrase.toUpperCase().replace(/[^A-Z ]/g, "").trim();
  const uniqueLetters = [...new Set(cleaned.replace(/ /g, "").split(""))];

  // Build a random substitution cipher
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const shuffled = rng.shuffle([...alphabet]);

  const cipher: Record<string, string> = {};
  const reverseCipher: Record<string, string> = {};
  for (let i = 0; i < alphabet.length; i++) {
    cipher[alphabet[i]] = shuffled[i];
    reverseCipher[shuffled[i]] = alphabet[i];
  }

  const encoded = cleaned.split("").map((ch) => (ch === " " ? " " : cipher[ch])).join("");

  // Hints: pre-revealed letters based on difficulty
  const hintCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 1 : 0;
  const hints: Record<string, string> = {};
  const rngHints = rng.shuffle([...uniqueLetters]).slice(0, hintCount);
  for (const letter of rngHints) {
    hints[cipher[letter]] = letter;
  }

  return { encoded, decoded: cleaned, reverseCipher, hints };
}
