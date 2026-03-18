const PROGRESS_PREFIX = "puzzlecraft-progress-";

export interface SavedProgress<T = unknown> {
  state: T;
  elapsed: number;
  savedAt: number;
}

export function saveProgress<T>(puzzleKey: string, state: T, elapsed: number): void {
  try {
    const data: SavedProgress<T> = { state, elapsed, savedAt: Date.now() };
    localStorage.setItem(PROGRESS_PREFIX + puzzleKey, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

export function loadProgress<T>(puzzleKey: string): SavedProgress<T> | null {
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + puzzleKey);
    if (!raw) return null;
    return JSON.parse(raw) as SavedProgress<T>;
  } catch {
    return null;
  }
}

export function clearProgress(puzzleKey: string): void {
  localStorage.removeItem(PROGRESS_PREFIX + puzzleKey);
}
