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

const SIZES: Record<Difficulty, number> = { easy: 10, medium: 12, hard: 14, extreme: 17, insane: 20 };
const WORD_COUNTS: Record<Difficulty, number> = { easy: 6, medium: 10, hard: 14, extreme: 18, insane: 22 };
const DIR_COUNTS: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6, extreme: 8, insane: 8 };

export function generateWordSearch(
  seed: number,
  difficulty: Difficulty,
  wordList: string[]
): WordSearchPuzzle {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const wordCount = WORD_COUNTS[difficulty];
  const dirCount = DIR_COUNTS[difficulty];
  const dirs = DIRECTIONS.slice(0, dirCount);

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const available = rng.shuffle(wordList.filter((w) => w.length >= 3 && w.length <= size));
  const placed: WordSearchPuzzle["wordPositions"] = [];

  for (const word of available) {
    if (placed.length >= wordCount) break;
    const shuffledDirs = rng.shuffle([...dirs]);
    let done = false;
    for (const [dr, dc] of shuffledDirs) {
      if (done) break;
      const positions: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) positions.push([r, c]);
      for (const [r, c] of rng.shuffle(positions)) {
        if (canPlace(grid, word, r, c, dr, dc, size)) {
          placeWord(grid, word, r, c, dr, dc);
          placed.push({ word, row: r, col: c, dr, dc });
          done = true;
          break;
        }
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
