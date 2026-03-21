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

/**
 * Remove progress entries older than `maxAgeMs` to prevent localStorage bloat.
 * Called sparingly (e.g. on app start).
 */
export function pruneStaleProgress(maxAgeMs = 48 * 60 * 60 * 1000): void {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PROGRESS_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as SavedProgress;
        if (now - parsed.savedAt > maxAgeMs) {
          localStorage.removeItem(key);
        }
      } catch {
        // Corrupt entry — remove it
        if (key) localStorage.removeItem(key);
      }
    }
  } catch {
    // Silently fail
  }
}
