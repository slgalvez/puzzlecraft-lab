/**
 * Lightweight "Save for Later" system.
 * Stores minimal puzzle references in localStorage so users can
 * intentionally bookmark specific puzzles to return to later.
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";

const STORAGE_KEY = "puzzlecraft-saved-puzzles";
const MAX_SAVED = 20;

export interface SavedPuzzle {
  /** Unique key: e.g. "sudoku-42-easy" */
  id: string;
  category: PuzzleCategory;
  difficulty: Difficulty;
  seed: number;
  savedAt: string;
  /** Optional daily code if it was a daily challenge */
  dailyCode?: string;
}

function getAll(): SavedPuzzle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPuzzle[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: SavedPuzzle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full
  }
}

export function savePuzzle(puzzle: Omit<SavedPuzzle, "savedAt">): void {
  const items = getAll();
  // Don't duplicate
  if (items.some((p) => p.id === puzzle.id)) return;
  items.unshift({ ...puzzle, savedAt: new Date().toISOString() });
  if (items.length > MAX_SAVED) items.length = MAX_SAVED;
  saveAll(items);
}

export function unsavePuzzle(id: string): void {
  saveAll(getAll().filter((p) => p.id !== id));
}

export function isSaved(id: string): boolean {
  return getAll().some((p) => p.id === id);
}

export function getSavedPuzzles(): SavedPuzzle[] {
  return getAll();
}

export function getSavedCount(): number {
  return getAll().length;
}
