import { SeededRandom } from "../seededRandom";
import type { Difficulty } from "../puzzleTypes";
import { WORD_CLUES } from "../wordList";
import type { CrosswordClue } from "@/data/puzzles";

export interface GeneratedCrossword {
  gridSize: number;
  blackCells: [number, number][];
  clues: CrosswordClue[];
}

const SIZES: Record<Difficulty, number> = { easy: 9, medium: 13, hard: 15, extreme: 19, insane: 21 };
const TARGETS: Record<Difficulty, number> = { easy: 6, medium: 14, hard: 22, extreme: 34, insane: 46 };

export function generateCrossword(seed: number, difficulty: Difficulty): GeneratedCrossword {
  const rng = new SeededRandom(seed);
  const size = SIZES[difficulty];
  const target = TARGETS[difficulty];
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));

  const words = rng.shuffle(
    WORD_CLUES.filter(([w]) => w.length >= 3 && w.length <= size - 2)
  );

  const placed: { word: string; clue: string; row: number; col: number; dir: "across" | "down" }[] = [];

  // Place first word horizontally at center
  if (words.length > 0) {
    const [word, clue] = words[0];
    const row = Math.floor(size / 2);
    const col = Math.floor((size - word.length) / 2);
    writeWord(grid, word, row, col, "across");
    placed.push({ word, clue, row, col, dir: "across" });
  }

  // Try placing remaining words
  for (let i = 1; i < words.length && placed.length < target; i++) {
    const [word, clue] = words[i];
    if (placed.some((p) => p.word === word)) continue;

    const result = findPlacement(grid, word, placed, size, rng);
    if (result) {
      writeWord(grid, word, result.row, result.col, result.dir);
      placed.push({ word, clue, row: result.row, col: result.col, dir: result.dir });
    }
  }

  // Identify black cells
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
      const startsAcross =
        (c === 0 || blackSet.has(`${r}-${c - 1}`)) &&
        c + 1 < size && !blackSet.has(`${r}-${c + 1}`);
      const startsDown =
        (r === 0 || blackSet.has(`${r - 1}-${c}`)) &&
        r + 1 < size && !blackSet.has(`${r + 1}-${c}`);
      if (startsAcross || startsDown) {
        numbers.set(`${r}-${c}`, num++);
      }
    }
  }

  // Build clues
  const clues: CrosswordClue[] = placed.map((p) => ({
    number: numbers.get(`${p.row}-${p.col}`) || 0,
    clue: p.clue,
    answer: p.word,
    row: p.row,
    col: p.col,
    direction: p.dir,
  }));

  return { gridSize: size, blackCells, clues };
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
  const shuffledPlaced = rng.shuffle([...placed]);

  for (const existing of shuffledPlaced) {
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < existing.word.length; j++) {
        if (word[i] !== existing.word[j]) continue;

        const newDir: "across" | "down" = existing.dir === "across" ? "down" : "across";
        let newRow: number, newCol: number;

        if (newDir === "down") {
          newRow = existing.row - i;
          newCol = existing.col + j;
        } else {
          newRow = existing.row + j;
          newCol = existing.col - i;
        }

        if (canPlace(grid, word, newRow, newCol, newDir, size)) {
          return { row: newRow, col: newCol, dir: newDir };
        }
      }
    }
  }
  return null;
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

  // Bounds
  if (row < 0 || col < 0) return false;
  if (row + dr * (word.length - 1) >= size) return false;
  if (col + dc * (word.length - 1) >= size) return false;

  // Cell before must be empty/border
  const prevR = row - dr, prevC = col - dc;
  if (prevR >= 0 && prevC >= 0 && grid[prevR][prevC]) return false;

  // Cell after must be empty/border
  const aftR = row + dr * word.length, aftC = col + dc * word.length;
  if (aftR < size && aftC < size && grid[aftR][aftC]) return false;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;

    if (grid[r][c]) {
      if (grid[r][c] !== word[i]) return false;
      intersections++;
    } else {
      // Check perpendicular neighbors are empty
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
