/**
 * Tracks where a puzzle was started from, so we can navigate back correctly.
 */

export type PuzzleOrigin = "play" | "lab" | "daily" | "library";

const KEY = "puzzlecraft-puzzle-origin";

export function setPuzzleOrigin(origin: PuzzleOrigin) {
  try {
    sessionStorage.setItem(KEY, origin);
  } catch { /* ignore */ }
}

export function getPuzzleOrigin(): PuzzleOrigin {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v === "play" || v === "lab" || v === "daily" || v === "library") return v;
  } catch { /* ignore */ }
  return "play";
}

export function getBackPath(origin: PuzzleOrigin): string {
  switch (origin) {
    case "lab": return "/generate";
    case "daily": return "/puzzles";
    case "library": return "/puzzles";
    case "play":
    default: return "/puzzles";
  }
}

export function getBackLabel(origin: PuzzleOrigin): string {
  switch (origin) {
    case "lab": return "Puzzle Lab";
    case "daily": return "Daily Challenge";
    case "library": return "Library";
    case "play":
    default: return "Play";
  }
}
