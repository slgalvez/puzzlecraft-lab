/**
 * Standardized puzzle solve tracking.
 *
 * Captures every completed solve with a consistent schema across all puzzle
 * types, entry points (Play, Daily, Endless, Craft), and platforms.
 *
 * Incomplete / abandoned attempts are NOT recorded here — only fully correct
 * solves qualify.
 *
 * Future-ready fields (userId, sendId, recipientId) are optional and unused
 * today but included in the schema so the data shape is stable when accounts
 * and multiplayer features land.
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";

// ── Public types ──

export interface SolveRecord {
  /** Unique id for this solve event (timestamp-based). */
  id: string;

  /** Opaque puzzle identifier (e.g. "crossword-medium-42345"). */
  puzzleId: string;

  /** Puzzle category. */
  puzzleType: PuzzleCategory;

  /** Difficulty at time of solve. */
  difficulty: Difficulty;

  /** Time in seconds from first move to completion. */
  solveTime: number;

  /** Number of error-flagged checks (Check Solution clicks that had errors). */
  mistakesCount: number;

  /** Number of hints revealed during the solve. */
  hintsUsed: number;

  /** ISO-8601 timestamp of completion. */
  completedAt: string;

  /** Whether this was a Daily Challenge solve. */
  isDailyChallenge: boolean;

  /** Whether the solve used any assistance (hints or reveal). */
  assisted: boolean;

  // ── Future-ready (structure only) ──

  /** User account id — will be populated once auth is added. */
  userId?: string;

  /** For crafted / sent puzzles — the send record id. */
  sendId?: string;

  /** For received puzzles — the recipient profile id. */
  recipientId?: string;

  /** Origin entry point. */
  origin?: "play" | "daily" | "endless" | "craft" | "library" | "shared";
}

// ── Storage ──

const STORAGE_KEY = "puzzlecraft-solves";
const MAX_RECORDS = 500;

function getRecords(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SolveRecord[];
  } catch {
    return [];
  }
}

function saveRecords(records: SolveRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage full — trim oldest
    try {
      records.length = Math.min(records.length, MAX_RECORDS / 2);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Silently fail
    }
  }
}

// ── Public API ──

export interface RecordSolveInput {
  puzzleId: string;
  puzzleType: PuzzleCategory;
  difficulty: Difficulty;
  solveTime: number;
  mistakesCount: number;
  hintsUsed: number;
  isDailyChallenge: boolean;
  assisted: boolean;
  origin?: SolveRecord["origin"];
}

/**
 * Record a completed solve. Only call this when the puzzle is fully and
 * correctly finished.
 */
export function recordSolve(input: RecordSolveInput): SolveRecord {
  const record: SolveRecord = {
    id: `solve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    puzzleId: input.puzzleId,
    puzzleType: input.puzzleType,
    difficulty: input.difficulty,
    solveTime: input.solveTime,
    mistakesCount: input.mistakesCount,
    hintsUsed: input.hintsUsed,
    completedAt: new Date().toISOString(),
    isDailyChallenge: input.isDailyChallenge,
    assisted: input.assisted,
    origin: input.origin,
  };

  const records = getRecords();
  records.unshift(record);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  saveRecords(records);

  return record;
}

/** Retrieve all solve records (newest first). */
export function getSolveRecords(): SolveRecord[] {
  return getRecords();
}

/** Get solve records filtered by category. */
export function getSolvesByType(puzzleType: PuzzleCategory): SolveRecord[] {
  return getRecords().filter((r) => r.puzzleType === puzzleType);
}

/** Get solve records for a specific date (YYYY-MM-DD). */
export function getSolvesByDate(dateStr: string): SolveRecord[] {
  return getRecords().filter((r) => r.completedAt.startsWith(dateStr));
}

/** Summary statistics derived from solve records. */
export function getSolveSummary() {
  const records = getRecords();
  if (records.length === 0) return null;

  const completed = records.filter((r) => !r.assisted);
  const totalTime = records.reduce((s, r) => s + r.solveTime, 0);
  const bestTime = Math.min(...records.map((r) => r.solveTime));
  const avgMistakes = records.reduce((s, r) => s + r.mistakesCount, 0) / records.length;
  const avgHints = records.reduce((s, r) => s + r.hintsUsed, 0) / records.length;

  const byType: Record<string, { count: number; bestTime: number; totalTime: number }> = {};
  for (const r of records) {
    if (!byType[r.puzzleType]) byType[r.puzzleType] = { count: 0, bestTime: Infinity, totalTime: 0 };
    const entry = byType[r.puzzleType];
    entry.count++;
    entry.totalTime += r.solveTime;
    entry.bestTime = Math.min(entry.bestTime, r.solveTime);
  }

  return {
    totalSolved: records.length,
    unassistedCount: completed.length,
    totalTime,
    averageTime: Math.round(totalTime / records.length),
    bestTime,
    averageMistakes: Math.round(avgMistakes * 10) / 10,
    averageHints: Math.round(avgHints * 10) / 10,
    byType,
    dailyChallengeCount: records.filter((r) => r.isDailyChallenge).length,
  };
}
