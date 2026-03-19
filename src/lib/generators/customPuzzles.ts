/**
 * Custom puzzle generators for personalized "For You" puzzles.
 * These accept user-provided words/phrases instead of using the built-in word list.
 * Difficulty affects structure/complexity only — never adds user content.
 */

import { SeededRandom } from "../seededRandom";

type CraftDifficulty = "easy" | "medium" | "hard";

// ─── Custom Word Fill-In ───

export interface CustomFillInData {
  gridSize: number;
  blackCells: [number, number][];
  entries: string[];
  solution: (string | null)[][];
}

/**
 * Difficulty controls:
 * - easy: generous grid padding (+6), words placed with many anchors
 * - medium: moderate padding (+4)
 * - hard: tight padding (+2), fewer obvious anchors, more ambiguous placement
 */
export function generateCustomFillIn(words: string[], difficulty: CraftDifficulty = "medium"): CustomFillInData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  const padding = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 2;
  const size = Math.max(9, maxLen + padding);
  const rng = new SeededRandom(Date.now() % 2147483646 || 1);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { word: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Sort by length descending for better placement
  const sorted = rng.shuffle([...cleaned]).sort((a, b) => b.length - a.length);

  // Place first word
  if (sorted.length > 0) {
    const word = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ word, row, col, dir: "across" });
  }

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    if (placed.some(p => p.word === word)) continue;
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
      if (grid[r][c]) solution[r][c] = grid[r][c];
      else blackCells.push([r, c]);
    }
  }

  return { gridSize: size, blackCells, entries: placed.map(p => p.word), solution };
}

// ─── Custom Cryptogram ───

export interface CustomCryptogramData {
  encoded: string;
  decoded: string;
  cipher: Record<string, string>;
  reverseCipher: Record<string, string>;
  hints: Record<string, string>;
}

/**
 * Difficulty controls (presentation / helper reduction only — never alters the message):
 * - easy: 3 letter hints revealed
 * - medium: 2 letter hints
 * - hard: 0 hints
 */
export function generateCustomCryptogram(phrase: string, difficulty: CraftDifficulty = "medium"): CustomCryptogramData {
  const decoded = phrase.toUpperCase().replace(/[^A-Z .,!?;:'"()-]/g, "");
  if (decoded.replace(/[^A-Z]/g, "").length < 3) throw new Error("Phrase too short");

  const rng = new SeededRandom(Date.now() % 2147483646 || 1);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  let shuffled: string[];
  do {
    shuffled = rng.shuffle([...alphabet]);
  } while (shuffled.some((c, i) => c === alphabet[i]));

  const cipher: Record<string, string> = {};
  const reverseCipher: Record<string, string> = {};
  for (let i = 0; i < 26; i++) {
    cipher[alphabet[i]] = shuffled[i];
    reverseCipher[shuffled[i]] = alphabet[i];
  }

  const encoded = decoded.split("").map(ch => cipher[ch] || ch).join("");

  // Hint count based on difficulty
  const hintCount = difficulty === "easy" ? 3 : difficulty === "medium" ? 2 : 0;
  const uniqueLetters = [...new Set(decoded.split("").filter(ch => /[A-Z]/.test(ch)))];
  const hintLetters = rng.shuffle(uniqueLetters).slice(0, hintCount);
  const hints: Record<string, string> = {};
  for (const letter of hintLetters) {
    hints[cipher[letter]] = letter;
  }

  return { encoded, decoded, cipher, reverseCipher, hints };
}

// ─── Custom Crossword ───

export interface CustomCrosswordData {
  gridSize: number;
  blackCells: [number, number][];
  clues: { number: number; clue: string; answer: string; row: number; col: number; direction: "across" | "down" }[];
}

/**
 * Difficulty controls (structure only — never adds entries):
 * - easy: generous grid (+6 padding), relaxed placement
 * - medium: moderate grid (+4)
 * - hard: tight grid (+2), more interlock attempts for denser crossings
 */
export function generateCustomCrossword(entries: { answer: string; clue: string }[], difficulty: CraftDifficulty = "medium"): CustomCrosswordData {
  const cleaned = entries
    .map(e => ({ answer: e.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: e.clue.trim() }))
    .filter(e => e.answer.length >= 2 && e.clue.length > 0);
  if (cleaned.length === 0) throw new Error("No valid entries");

  const maxLen = Math.max(...cleaned.map(e => e.answer.length));
  const padding = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 2;
  const size = Math.max(9, maxLen + padding);
  const rng = new SeededRandom(Date.now() % 2147483646 || 1);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[] = [];

  const sorted = rng.shuffle([...cleaned]).sort((a, b) => b.answer.length - a.answer.length);

  if (sorted.length > 0) {
    const { answer, clue } = sorted[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - answer.length) / 2);
    writeWord(grid, answer, row, col, "across");
    placed.push({ word: answer, clue, row, col, dir: "across" });
  }

  // Hard difficulty: multiple passes to maximize interlocking
  const passes = difficulty === "hard" ? 3 : 1;
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

  const blackCells: [number, number][] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) blackCells.push([r, c]);

  // Number cells
  const blackSet = new Set(blackCells.map(([r, c]) => `${r}-${c}`));
  const numbers = new Map<string, number>();
  let num = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (blackSet.has(`${r}-${c}`)) continue;
      const startsAcross = (c === 0 || blackSet.has(`${r}-${c - 1}`)) && c + 1 < size && !blackSet.has(`${r}-${c + 1}`);
      const startsDown = (r === 0 || blackSet.has(`${r - 1}-${c}`)) && r + 1 < size && !blackSet.has(`${r + 1}-${c}`);
      if (startsAcross || startsDown) numbers.set(`${r}-${c}`, num++);
    }
  }

  const clues = placed.map(p => ({
    number: numbers.get(`${p.row}-${p.col}`) || 0,
    clue: p.clue,
    answer: p.word,
    row: p.row,
    col: p.col,
    direction: p.dir,
  }));

  return { gridSize: size, blackCells, clues };
}

// ─── Custom Word Search ───

export interface CustomWordSearchData {
  grid: string[][];
  words: string[];
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
}

/**
 * Difficulty controls (structure only — never adds words):
 * - easy: horizontal + vertical only, generous grid (+6)
 * - medium: + diagonal directions, moderate grid (+4)
 * - hard: + backwards directions (all 8), tight grid (+2), denser filler
 */
export function generateCustomWordSearch(words: string[], difficulty: CraftDifficulty = "medium"): CustomWordSearchData {
  const cleaned = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, "")).filter(w => w.length >= 2);
  if (cleaned.length === 0) throw new Error("No valid words provided");

  const maxLen = Math.max(...cleaned.map(w => w.length));
  const padding = difficulty === "easy" ? 6 : difficulty === "medium" ? 4 : 2;
  const size = Math.max(10, maxLen + padding);
  const rng = new SeededRandom(Date.now() % 2147483646 || 1);

  // Direction sets by difficulty
  const DIRS_EASY: [number, number][] = [[0, 1], [1, 0]];
  const DIRS_MEDIUM: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const DIRS_HARD: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const dirs = difficulty === "easy" ? DIRS_EASY : difficulty === "medium" ? DIRS_MEDIUM : DIRS_HARD;

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placed: CustomWordSearchData["wordPositions"] = [];

  for (const word of rng.shuffle([...cleaned])) {
    const shuffledDirs = rng.shuffle([...dirs]);
    let done = false;
    for (const [dr, dc] of shuffledDirs) {
      if (done) break;
      const positions: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) positions.push([r, c]);
      for (const [r, c] of rng.shuffle(positions)) {
        if (canPlaceWS(grid, word, r, c, dr, dc, size)) {
          placeWordWS(grid, word, r, c, dr, dc);
          placed.push({ word, row: r, col: c, dr, dc });
          done = true;
          break;
        }
      }
    }
  }

  // Filler: on hard, use letters from placed words for more distracting fill
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const wordLetters = difficulty === "hard"
    ? [...new Set(cleaned.join("").split(""))].join("") || letters
    : letters;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = wordLetters[rng.nextInt(0, wordLetters.length - 1)];

  return { grid, words: placed.map(p => p.word), wordPositions: placed, size };
}

// ─── Shared helpers ───

function writeWord(grid: string[][], word: string, row: number, col: number, dir: "across" | "down") {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}

function findPlacement(
  grid: string[][], word: string,
  placed: { word: string; row: number; col: number; dir: "across" | "down" }[],
  size: number, rng: SeededRandom
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

function canPlaceWS(grid: string[][], word: string, row: number, col: number, dr: number, dc: number, size: number): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWordWS(grid: string[][], word: string, row: number, col: number, dr: number, dc: number) {
  for (let i = 0; i < word.length; i++) grid[row + dr * i][col + dc * i] = word[i];
}
