import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";

export interface WordSearchPuzzle {
  grid: string[][];
  words: string[];
  wordPositions: { word: string; row: number; col: number; dr: number; dc: number }[];
  size: number;
}

const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

const SIZES: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 16, extreme: 20, insane: 22 };
const WORD_COUNTS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 16, extreme: 22, insane: 28 };
const DIR_COUNTS: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6, extreme: 8, insane: 8 };
const MIN_WORD_LEN: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5, extreme: 5, insane: 5 };
const MIN_PLACED: Record<Difficulty, number> = { easy: 3, medium: 6, hard: 10, extreme: 14, insane: 18 };

export function generateWordSearch(
  seed: number,
  difficulty: Difficulty,
  wordList: string[]
): WordSearchPuzzle {
  const maxAttempts = 5;
  let bestResult: WordSearchPuzzle | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryGenerate(seed + attempt * 7919, difficulty, wordList);
    if (result.words.length < MIN_PLACED[difficulty]) continue;
    if (!validateGrid(result)) continue;

    const score = scorePuzzle(result);
    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
    if (result.words.length >= WORD_COUNTS[difficulty] && score > 0) break;
  }

  if (bestResult) return bestResult;

  // Fallback for extreme/insane → hard
  if (difficulty === "insane" || difficulty === "extreme") {
    return generateWordSearch(seed, "hard", wordList);
  }
  return tryGenerate(seed, difficulty, wordList);
}

/** Score spatial distribution — penalise clustering */
function scorePuzzle(puzzle: WordSearchPuzzle): number {
  const { size, wordPositions } = puzzle;
  if (wordPositions.length === 0) return -100;

  const quads = [0, 0, 0, 0];
  for (const wp of wordPositions) {
    const midR = wp.row + wp.dr * (wp.word.length - 1) / 2;
    const midC = wp.col + wp.dc * (wp.word.length - 1) / 2;
    const qi = (midR < size / 2 ? 0 : 2) + (midC < size / 2 ? 0 : 1);
    quads[qi]++;
  }
  const avg = wordPositions.length / 4;
  const imbalance = quads.reduce((s, q) => s + Math.abs(q - avg), 0);

  return wordPositions.length * 10 - imbalance * 3;
}

/** Verify every placed word exists intact at its recorded position */
function validateGrid(puzzle: WordSearchPuzzle): boolean {
  const { grid, wordPositions, size } = puzzle;
  for (const wp of wordPositions) {
    for (let i = 0; i < wp.word.length; i++) {
      const r = wp.row + wp.dr * i;
      const c = wp.col + wp.dc * i;
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      if (grid[r][c] !== wp.word[i]) return false;
    }
  }
  const wordSet = new Set(wordPositions.map(w => w.word));
  if (wordSet.size !== wordPositions.length) return false;
  return true;
}

function tryGenerate(
  seed: number,
  difficulty: Difficulty,
  wordList: string[]
): WordSearchPuzzle {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const wordCount = WORD_COUNTS[difficulty];
  const dirCount = DIR_COUNTS[difficulty];
  const minLen = MIN_WORD_LEN[difficulty];
  const dirs = DIRECTIONS.slice(0, dirCount);

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const available = rng.shuffle(wordList.filter((w) => w.length >= minLen && w.length <= size));
  const placed: WordSearchPuzzle["wordPositions"] = [];
  const placedWords = new Set<string>();
  const cellUsed = new Map<string, number>();

  for (const word of available) {
    if (placed.length >= wordCount) break;
    if (placedWords.has(word)) continue;

    const shuffledDirs = rng.shuffle([...dirs]);
    let bestPos: { r: number; c: number; dr: number; dc: number; score: number } | null = null;

    for (const [dr, dc] of shuffledDirs) {
      const positions: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) positions.push([r, c]);

      for (const [r, c] of rng.shuffle(positions)) {
        if (!canPlace(grid, word, r, c, dr, dc, size)) continue;

        let overlaps = 0;
        for (let i = 0; i < word.length; i++) {
          const key = `${r + dr * i}-${c + dc * i}`;
          if (cellUsed.has(key)) overlaps++;
        }
        if (overlaps / word.length > 0.3) continue;

        const midR = r + dr * (word.length - 1) / 2;
        const midC = c + dc * (word.length - 1) / 2;
        const distFromCenter = Math.abs(midR - size / 2) + Math.abs(midC - size / 2);
        const posScore = (size - distFromCenter) - overlaps * 3;

        if (!bestPos || posScore > bestPos.score) {
          bestPos = { r, c, dr, dc, score: posScore };
        }
      }
    }

    if (bestPos) {
      placeWord(grid, word, bestPos.r, bestPos.c, bestPos.dr, bestPos.dc);
      placed.push({ word, row: bestPos.r, col: bestPos.c, dr: bestPos.dr, dc: bestPos.dc });
      placedWords.add(word);
      for (let i = 0; i < word.length; i++) {
        const key = `${bestPos.r + bestPos.dr * i}-${bestPos.c + bestPos.dc * i}`;
        cellUsed.set(key, (cellUsed.get(key) || 0) + 1);
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = letters[rng.nextInt(0, 25)];

  return { grid, words: placed.map((p) => p.word), wordPositions: placed, size };
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number
) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}
