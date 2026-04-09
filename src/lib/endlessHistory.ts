/**
 * Persistence layer for Endless Mode session history.
 * Stores completed sessions in localStorage.
 */
import type { Difficulty, PuzzleCategory } from "./puzzleTypes";

const STORAGE_KEY = "puzzlecraft_endless_sessions";

export interface EndlessSessionRecord {
  id: string;
  date: string;              // ISO date string
  totalSolved: number;
  totalTime: number;          // seconds
  fastestSolve: number;       // seconds
  typesPlayed: PuzzleCategory[];
  solves: {
    type: PuzzleCategory;
    difficulty: Difficulty;
    elapsed: number;
    diffChange: "up" | "down" | "stay";
  }[];
  finalDifficulties: Partial<Record<PuzzleCategory, Difficulty>>;
}

export function saveEndlessSession(session: Omit<EndlessSessionRecord, "id" | "date">): EndlessSessionRecord {
  const record: EndlessSessionRecord = {
    ...session,
    id: `endless-${Date.now()}`,
    date: new Date().toISOString(),
  };

  const sessions = getEndlessSessions();
  sessions.unshift(record); // newest first
  // Keep only last 50 sessions
  if (sessions.length > 50) sessions.length = 50;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* quota exceeded — silently drop oldest */ }

  return record;
}

export function getEndlessSessions(includeDemo = false): EndlessSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as EndlessSessionRecord[];
    return includeDemo ? all : all.filter((r: any) => !r.__demo);
  } catch {
    return [];
  }
}

export function getEndlessStats() {
  const sessions = getEndlessSessions();
  if (sessions.length === 0) return null;

  const totalSessions = sessions.length;
  const totalSolved = sessions.reduce((s, r) => s + r.totalSolved, 0);
  const totalTime = sessions.reduce((s, r) => s + r.totalTime, 0);
  const bestSession = sessions.reduce((best, r) => r.totalSolved > best.totalSolved ? r : best, sessions[0]);
  const fastestEver = Math.min(...sessions.filter(s => s.fastestSolve > 0).map(s => s.fastestSolve));

  return {
    totalSessions,
    totalSolved,
    totalTime,
    bestSessionSolved: bestSession.totalSolved,
    fastestEver: isFinite(fastestEver) ? fastestEver : null,
    recentSessions: sessions.slice(0, 10),
  };
}
