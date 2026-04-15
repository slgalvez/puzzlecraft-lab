/**
 * Pure functions that compute stats from provided data arrays,
 * mirroring the localStorage-based helpers but accepting data directly.
 */
import type { CompletionRecord, ProgressStats } from "./progressTracker";
import type { SolveRecord } from "./solveTracker";

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

function calcStreakFrom(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const unique = [...new Set(dates)].sort().reverse();
  const today = toDateStr(new Date().toISOString());
  const yesterday = toDateStr(new Date(Date.now() - 86400000).toISOString());

  let current = 0;
  if (unique[0] === today || unique[0] === yesterday) {
    current = 1;
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1]);
      const curr = new Date(unique[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.round(diff) === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  const sorted = [...new Set(unique)].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) { run++; longest = Math.max(longest, run); }
    else { run = 1; }
  }
  longest = Math.max(longest, current);
  return { current, longest };
}

export function getProgressStatsFrom(records: CompletionRecord[]): ProgressStats {
  if (records.length === 0) {
    return {
      totalSolved: 0, totalTime: 0, averageTime: 0, bestTime: null,
      currentStreak: 0, longestStreak: 0, byCategory: {},
      recentCompletions: [], solvedDates: [],
    };
  }

  const totalTime = records.reduce((s, r) => s + r.time, 0);
  const bestTime = Math.min(...records.map((r) => r.time));
  const nonAssisted = records.filter((r) => !r.assisted);
  const dates = nonAssisted.map((r) => toDateStr(r.date));
  const { current, longest } = calcStreakFrom(dates);

  const byCategory: ProgressStats["byCategory"] = {};
  for (const r of records) {
    if (!byCategory[r.category]) byCategory[r.category] = { solved: 0, bestTime: Infinity, totalTime: 0 };
    const cat = byCategory[r.category];
    cat.solved++;
    cat.totalTime += r.time;
    cat.bestTime = Math.min(cat.bestTime, r.time);
  }

  return {
    totalSolved: records.length,
    totalTime,
    averageTime: Math.round(totalTime / records.length),
    bestTime,
    currentStreak: current,
    longestStreak: longest,
    byCategory,
    recentCompletions: [...records].reverse().slice(0, 20),
    solvedDates: [...new Set(dates)].sort().reverse(),
  };
}

export function getSolveRecordsFrom(solves: SolveRecord[]): SolveRecord[] {
  return solves.filter((r: any) => !r.__demo);
}

export function getDailyStreakFrom(dailyData: Record<string, any>): { current: number; longest: number } {
  const dates = Object.keys(dailyData).filter((k) => dailyData[k]?.time != null);
  return calcStreakFrom(dates);
}

export function getTotalDailyCompletedFrom(dailyData: Record<string, any>): number {
  return Object.keys(dailyData).filter((k) => dailyData[k]?.time != null).length;
}

export function getDailyCompletionFrom(
  dailyData: Record<string, any>,
  dateStr: string,
): { dateStr: string; time: number; category: string; difficulty: string } | null {
  const entry = dailyData[dateStr];
  if (!entry || entry.time == null) return null;
  return entry;
}

export function getEndlessStatsFrom(endlessData: any) {
  const sessions = Array.isArray(endlessData) ? endlessData : [];
  if (sessions.length === 0) return null;

  const totalSessions = sessions.length;
  const totalSolved = sessions.reduce((s: number, r: any) => s + (r.totalSolved ?? 0), 0);
  const totalTime = sessions.reduce((s: number, r: any) => s + (r.totalTime ?? 0), 0);
  const bestSession = sessions.reduce((best: any, r: any) => (r.totalSolved ?? 0) > (best.totalSolved ?? 0) ? r : best, sessions[0]);
  const fastestEver = Math.min(...sessions.filter((s: any) => (s.fastestSolve ?? 0) > 0).map((s: any) => s.fastestSolve));

  return {
    totalSessions,
    totalSolved,
    totalTime,
    bestSessionSolved: bestSession?.totalSolved ?? 0,
    fastestEver: isFinite(fastestEver) ? fastestEver : null,
    recentSessions: sessions.slice(0, 10),
  };
}

export function getPlayedDatesFrom(completions: CompletionRecord[]): Set<string> {
  return new Set(completions.map((r) => toDateStr(r.date)));
}
