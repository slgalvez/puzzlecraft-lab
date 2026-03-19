import type { PuzzleCategory } from "@/lib/puzzleTypes";

export interface CompletionRecord {
  puzzleKey: string;
  category: PuzzleCategory;
  difficulty: string;
  time: number;
  date: string;
  assisted?: boolean;
}

export interface ProgressStats {
  totalSolved: number;
  totalTime: number;
  averageTime: number;
  bestTime: number | null;
  currentStreak: number;
  longestStreak: number;
  byCategory: Record<string, { solved: number; bestTime: number; totalTime: number }>;
  recentCompletions: CompletionRecord[];
  solvedDates: string[];
}

const COMPLETIONS_KEY = "puzzlecraft-completions";

function getCompletions(): CompletionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCompletions(records: CompletionRecord[]) {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(records));
}

export function recordCompletion(
  puzzleKey: string,
  category: PuzzleCategory,
  difficulty: string,
  time: number,
  assisted?: boolean
) {
  const records = getCompletions();
  records.push({
    puzzleKey,
    category,
    difficulty,
    time,
    date: new Date().toISOString(),
    assisted: assisted || false,
  });
  saveCompletions(records);
}

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

function calcStreak(dates: string[]): { current: number; longest: number } {
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
  const sorted = [...new Set(dates)].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  longest = Math.max(longest, current);

  return { current, longest };
}

export function getProgressStats(): ProgressStats {
  const records = getCompletions();

  if (records.length === 0) {
    return {
      totalSolved: 0,
      totalTime: 0,
      averageTime: 0,
      bestTime: null,
      currentStreak: 0,
      longestStreak: 0,
      byCategory: {},
      recentCompletions: [],
      solvedDates: [],
    };
  }

  const totalTime = records.reduce((s, r) => s + r.time, 0);
  const bestTime = Math.min(...records.map((r) => r.time));
  const dates = records.map((r) => toDateStr(r.date));
  const { current, longest } = calcStreak(dates);

  const byCategory: ProgressStats["byCategory"] = {};
  for (const r of records) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { solved: 0, bestTime: Infinity, totalTime: 0 };
    }
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
