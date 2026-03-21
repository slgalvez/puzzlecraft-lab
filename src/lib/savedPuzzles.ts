/**
 * Lightweight "Save for Later" system.
 * Stores minimal puzzle references in localStorage so users can
 * intentionally bookmark specific puzzles to return to later.
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";
import { loadProgress } from "./puzzleProgress";

const STORAGE_KEY = "puzzlecraft-saved-puzzles";
const MAX_SAVED = 5;

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

export function savePuzzle(puzzle: Omit<SavedPuzzle, "savedAt">): boolean {
  const items = getAll();
  // Don't duplicate
  if (items.some((p) => p.id === puzzle.id)) return true;
  if (items.length >= MAX_SAVED) return false; // at limit
  items.unshift({ ...puzzle, savedAt: new Date().toISOString() });
  saveAll(items);
  return true;
}

/** Remove oldest and add new */
export function savePuzzleReplacingOldest(puzzle: Omit<SavedPuzzle, "savedAt">): void {
  const items = getAll().filter((p) => p.id !== puzzle.id);
  if (items.length >= MAX_SAVED) items.pop();
  items.unshift({ ...puzzle, savedAt: new Date().toISOString() });
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

export function isAtLimit(): boolean {
  return getAll().length >= MAX_SAVED;
}

/** Check if a saved puzzle has in-progress state */
export function getSavedPuzzleProgress(puzzle: SavedPuzzle): { hasProgress: boolean; elapsed: number } {
  const key = `${puzzle.category}-${puzzle.seed}-${puzzle.difficulty}`;
  const progress = loadProgress(key);
  if (progress) return { hasProgress: true, elapsed: progress.elapsed };
  return { hasProgress: false, elapsed: 0 };
}
