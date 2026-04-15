/**
 * solveTracker.ts  ← FULL REPLACEMENT
 * src/lib/solveTracker.ts
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 * 1. getSolveRecords() — removed the `includeDemo` parameter from the
 *    public signature. It now ALWAYS filters out __demo records. This makes
 *    it impossible for any component to accidentally pass `true` and leak
 *    demo data into a real user's view.
 *
 * 2. getDemoSolveRecords() — new admin-only export that returns demo records.
 *    Only called from admin-gated paths in PremiumStats. The name makes the
 *    intent explicit and the caller can't confuse it with real user data.
 *
 * 3. getSolveSummary() — same change: no `includeDemo` param. Always real
 *    data only. Admin demo summary comes from getDemoSolveSummary().
 *
 * Everything else (recordSolve, getSolvesByType, getSolvesByDate) unchanged.
 */

import type { PuzzleCategory, Difficulty } from "./puzzleTypes";

// ── Public types ──────────────────────────────────────────────────────────

export interface SolveRecord {
  id:                string;
  puzzleId:          string;
  puzzleType:        PuzzleCategory;
  difficulty:        Difficulty;
  solveTime:         number;
  mistakesCount:     number;
  hintsUsed:         number;
  completedAt:       string;
  isDailyChallenge:  boolean;
  assisted:          boolean;
  userId?:           string;
  sendId?:           string;
  recipientId?:      string;
  origin?:           "play" | "daily" | "endless" | "craft" | "library" | "shared";
}

// ── Storage ───────────────────────────────────────────────────────────────

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
    try {
      records.length = Math.min(records.length, MAX_RECORDS / 2);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export interface RecordSolveInput {
  puzzleId:          string;
  puzzleType:        PuzzleCategory;
  difficulty:        Difficulty;
  solveTime:         number;
  mistakesCount:     number;
  hintsUsed:         number;
  isDailyChallenge:  boolean;
  assisted:          boolean;
  origin?:           SolveRecord["origin"];
}

export function recordSolve(input: RecordSolveInput): SolveRecord {
  const record: SolveRecord = {
    id:               `solve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    puzzleId:         input.puzzleId,
    puzzleType:       input.puzzleType,
    difficulty:       input.difficulty,
    solveTime:        input.solveTime,
    mistakesCount:    input.mistakesCount,
    hintsUsed:        input.hintsUsed,
    completedAt:      new Date().toISOString(),
    isDailyChallenge: input.isDailyChallenge,
    assisted:         input.assisted,
    origin:           input.origin,
  };

  const records = getRecords();
  records.unshift(record);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  saveRecords(records);
  return record;
}

// ── Tier-up detection ─────────────────────────────────────────────────────

const TIER_UP_KEY = "puzzlecraft-tier-up";

export interface TierUpEvent {
  fromTier: string;
  toTier: string;
  rating: number;
  timestamp: string;
}

/**
 * Check if the latest solve caused a tier change.
 * Call AFTER recordSolve(). Returns the event if a tier-up occurred, null otherwise.
 * Consumes the event (one-shot read).
 */
export function checkTierUp(): TierUpEvent | null {
  try {
    const raw = localStorage.getItem(TIER_UP_KEY);
    if (!raw) return null;
    localStorage.removeItem(TIER_UP_KEY);
    return JSON.parse(raw) as TierUpEvent;
  } catch {
    return null;
  }
}

/**
 * Detect and store a tier-up event by comparing the tier before and after adding a record.
 * Called internally by recordSolve — consumers read via checkTierUp().
 */
function detectAndStoreTierUp(recordsBefore: SolveRecord[], recordsAfter: SolveRecord[]): void {
  // Lazy import to avoid circular deps
  const { computePlayerRating, getSkillTier } = require("./solveScoring");
  const validBefore = recordsBefore.filter((r: SolveRecord) => r.solveTime >= 10 && !(r as any).__demo);
  const validAfter  = recordsAfter.filter((r: SolveRecord) => r.solveTime >= 10 && !(r as any).__demo);

  if (validBefore.length === 0) return; // first solve — no tier-up possible

  const ratingBefore = computePlayerRating(validBefore);
  const ratingAfter  = computePlayerRating(validAfter);
  const tierBefore = getSkillTier(ratingBefore);
  const tierAfter  = getSkillTier(ratingAfter);

  if (tierAfter !== tierBefore) {
    const event: TierUpEvent = {
      fromTier: tierBefore,
      toTier: tierAfter,
      rating: ratingAfter,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(TIER_UP_KEY, JSON.stringify(event));
    } catch {}
  }
}

/**
 * Returns real solve records only — never includes demo data.
 * This is the ONLY function components should use for real user views.
 */
export function getSolveRecords(): SolveRecord[] {
  return getRecords().filter((r: any) => !r.__demo);
}

/**
 * Admin-only: returns demo solve records.
 * Only call from admin-gated code paths.
 */
export function getDemoSolveRecords(): SolveRecord[] {
  return getRecords().filter((r: any) => !!r.__demo);
}

/**
 * All records including demo — admin admin panel only.
 * Named explicitly so callers cannot accidentally use it in user views.
 */
export function getAllSolveRecordsIncludingDemo(): SolveRecord[] {
  return getRecords();
}

export function getSolvesByType(puzzleType: PuzzleCategory): SolveRecord[] {
  return getRecords().filter((r: any) => r.puzzleType === puzzleType && !r.__demo);
}

export function getSolvesByDate(dateStr: string): SolveRecord[] {
  return getRecords().filter((r: any) => r.completedAt.startsWith(dateStr) && !r.__demo);
}

// ── Summary helpers ───────────────────────────────────────────────────────

function buildSummary(records: SolveRecord[]) {
  if (records.length === 0) return null;

  const completed   = records.filter((r) => !r.assisted);
  const totalTime   = records.reduce((s, r) => s + r.solveTime, 0);
  const bestTime    = Math.min(...records.map((r) => r.solveTime));
  const avgMistakes = records.reduce((s, r) => s + r.mistakesCount, 0) / records.length;
  const avgHints    = records.reduce((s, r) => s + r.hintsUsed, 0) / records.length;

  const byType: Record<string, { count: number; bestTime: number; totalTime: number }> = {};
  for (const r of records) {
    if (!byType[r.puzzleType])
      byType[r.puzzleType] = { count: 0, bestTime: Infinity, totalTime: 0 };
    const e = byType[r.puzzleType];
    e.count++;
    e.totalTime += r.solveTime;
    e.bestTime = Math.min(e.bestTime, r.solveTime);
  }

  return {
    totalSolved:          records.length,
    unassistedCount:      completed.length,
    totalTime,
    averageTime:          Math.round(totalTime / records.length),
    bestTime,
    averageMistakes:      Math.round(avgMistakes * 10) / 10,
    averageHints:         Math.round(avgHints * 10) / 10,
    byType,
    dailyChallengeCount:  records.filter((r) => r.isDailyChallenge).length,
  };
}

/** Summary of real user solves only. */
export function getSolveSummary() {
  return buildSummary(getSolveRecords());
}

/** Admin-only: summary that includes demo records (for admin preview panel). */
export function getDemoSolveSummary() {
  return buildSummary(getAllSolveRecordsIncludingDemo());
}
