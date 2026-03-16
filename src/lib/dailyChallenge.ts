import type { PuzzleCategory, Difficulty } from "@/lib/puzzleTypes";

const DAILY_COMPLETIONS_KEY = "puzzlecraft-daily-completions";

/** Rotating puzzle types for daily challenges */
const DAILY_TYPES: PuzzleCategory[] = [
  "sudoku",
  "crossword",
  "word-search",
  "kakuro",
  "nonogram",
  "cryptogram",
  "word-fill",
  "number-fill",
];

/** Rotating difficulties (cycles weekly) */
const DAILY_DIFFICULTIES: Difficulty[] = [
  "easy",
  "medium",
  "medium",
  "hard",
  "hard",
  "extreme",
  "medium",
];

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 1_000_000;
}

export interface DailyChallenge {
  dateStr: string;
  category: PuzzleCategory;
  difficulty: Difficulty;
  seed: number;
  displayDate: string;
}

export function getTodaysChallenge(): DailyChallenge {
  return getChallengeForDate(new Date());
}

export function getChallengeForDate(date: Date): DailyChallenge {
  const dateStr = dateToStr(date);
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const dayOfWeek = date.getDay();

  const category = DAILY_TYPES[dayOfYear % DAILY_TYPES.length];
  const difficulty = DAILY_DIFFICULTIES[dayOfWeek];
  const seed = dateSeed(dateStr);

  const displayDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return { dateStr, category, difficulty, seed, displayDate };
}

export interface DailyCompletion {
  dateStr: string;
  time: number;
  category: PuzzleCategory;
  difficulty: Difficulty;
}

function getCompletions(): Record<string, DailyCompletion> {
  try {
    return JSON.parse(localStorage.getItem(DAILY_COMPLETIONS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function recordDailyCompletion(
  dateStr: string,
  time: number,
  category: PuzzleCategory,
  difficulty: Difficulty
) {
  const completions = getCompletions();
  // Only record if not already completed or if better time
  const existing = completions[dateStr];
  if (!existing || time < existing.time) {
    completions[dateStr] = { dateStr, time, category, difficulty };
    localStorage.setItem(DAILY_COMPLETIONS_KEY, JSON.stringify(completions));
  }
}

export function getDailyCompletion(dateStr: string): DailyCompletion | null {
  return getCompletions()[dateStr] || null;
}

export function getDailyStreak(): { current: number; longest: number } {
  const completions = getCompletions();
  const dates = Object.keys(completions).sort().reverse();

  if (dates.length === 0) return { current: 0, longest: 0 };

  const today = dateToStr(new Date());
  const yesterday = dateToStr(new Date(Date.now() - 86400000));

  let current = 0;
  if (dates[0] === today || dates[0] === yesterday) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (Math.round(diff) === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let run = 1;
  const sorted = dates.sort();
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

export function getTotalDailyCompleted(): number {
  return Object.keys(getCompletions()).length;
}
