/**
 * Admin-only demo solve data generator for Puzzlecraft+ testing.
 *
 * Generates realistic synthetic solve records across both data stores
 * (solveTracker + progressTracker) so premium analytics can be previewed.
 * Also generates daily challenge completions and endless mode sessions.
 *
 * All demo records carry a `__demo: true` flag for easy identification.
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";

const SOLVES_KEY = "puzzlecraft-solves";
const COMPLETIONS_KEY = "puzzlecraft-completions";
const DAILY_KEY = "puzzlecraft-daily-completions";
const ENDLESS_KEY = "puzzlecraft_endless_sessions";
const DEMO_FLAG_KEY = "puzzlecraft-demo-active";

// ── Realistic distributions ──

const TYPES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/** Base solve-time ranges in seconds per type (easy/medium/hard). */
const TIME_RANGES: Record<PuzzleCategory, [number, number, number, number, number, number]> = {
  crossword:    [90, 180,  150, 360,  300, 600],
  "word-fill":  [60, 120,  100, 240,  180, 420],
  "number-fill":[60, 120,  100, 240,  180, 420],
  sudoku:       [120, 300, 240, 600,  480, 1200],
  "word-search":[40, 90,   70, 150,   120, 300],
  kakuro:       [120, 300, 240, 540,  360, 900],
  nonogram:     [60, 150,  120, 300,  240, 600],
  cryptogram:   [90, 200,  150, 360,  240, 540],
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedDifficulty(): Difficulty {
  const r = Math.random();
  if (r < 0.3) return "easy";
  if (r < 0.75) return "medium";
  return "hard";
}

function generateTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(rand(8, 22), rand(0, 59), rand(0, 59));
  return d.toISOString();
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function solveTimeFor(type: PuzzleCategory, diff: Difficulty): number {
  const ranges = TIME_RANGES[type];
  const idx = diff === "easy" ? 0 : diff === "medium" ? 2 : 4;
  return rand(ranges[idx], ranges[idx + 1]);
}

// ── Generator ──

export function generateDemoSolves(count = 25) {
  const solveRecords: any[] = [];
  const completionRecords: any[] = [];

  // Spread solves across the last 21 days
  for (let i = 0; i < count; i++) {
    const type = pick(TYPES);
    const difficulty = weightedDifficulty();
    const solveTime = solveTimeFor(type, difficulty);
    const daysAgo = rand(0, 20);
    const completedAt = generateTimestamp(daysAgo);
    const mistakesCount = Math.random() < 0.6 ? 0 : rand(1, 3);
    const hintsUsed = Math.random() < 0.7 ? 0 : rand(1, 2);
    const assisted = hintsUsed > 0;
    const id = `demo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

    // Roughly 20% daily, 20% endless, 60% regular play
    const r = Math.random();
    const isDailyChallenge = r < 0.2;
    const origin: "play" | "daily" | "endless" | "library" =
      r < 0.2 ? "daily" : r < 0.4 ? "endless" : pick(["play", "library"] as const);

    solveRecords.push({
      id,
      puzzleId: `demo-${type}-${difficulty}-${i}`,
      puzzleType: type,
      difficulty,
      solveTime,
      mistakesCount,
      hintsUsed,
      completedAt,
      isDailyChallenge,
      assisted,
      origin,
      __demo: true,
    });

    completionRecords.push({
      puzzleKey: `demo-${type}-${difficulty}-${i}`,
      category: type,
      difficulty,
      time: solveTime,
      date: completedAt,
      assisted,
      __demo: true,
    });
  }

  // Sort newest first for solves, oldest first for completions
  solveRecords.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  completionRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  try {
    // Merge solves
    const existingSolves = JSON.parse(localStorage.getItem(SOLVES_KEY) || "[]");
    const realSolves = existingSolves.filter((r: any) => !r.__demo);
    localStorage.setItem(SOLVES_KEY, JSON.stringify([...solveRecords, ...realSolves]));

    // Merge completions
    const existingCompletions = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || "[]");
    const realCompletions = existingCompletions.filter((r: any) => !r.__demo);
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify([...realCompletions, ...completionRecords]));

    // Generate daily challenge completions (8-12 days over last 21 days)
    const existingDaily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
    // Remove old demo dailies
    const realDaily: Record<string, any> = {};
    for (const [k, v] of Object.entries(existingDaily)) {
      if (!(v as any).__demo) realDaily[k] = v;
    }
    const dailyCount = rand(8, 12);
    const usedDays = new Set<number>();
    for (let i = 0; i < dailyCount; i++) {
      let day: number;
      do { day = rand(0, 20); } while (usedDays.has(day));
      usedDays.add(day);
      const d = new Date();
      d.setDate(d.getDate() - day);
      const dateStr = dateToStr(d);
      const type = pick(TYPES);
      const diff = weightedDifficulty();
      realDaily[dateStr] = {
        dateStr,
        time: solveTimeFor(type, diff),
        category: type,
        difficulty: diff,
        __demo: true,
      };
    }
    localStorage.setItem(DAILY_KEY, JSON.stringify(realDaily));

    // Generate endless mode sessions (3-5 sessions)
    const existingEndless = JSON.parse(localStorage.getItem(ENDLESS_KEY) || "[]");
    const realEndless = existingEndless.filter((r: any) => !r.__demo);
    const sessionCount = rand(3, 5);
    const demoSessions: any[] = [];
    for (let s = 0; s < sessionCount; s++) {
      const daysAgo = rand(0, 18);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(rand(10, 21), rand(0, 59), rand(0, 59));
      const solveCount = rand(3, 8);
      const sessionTypes = Array.from({ length: solveCount }, () => pick(TYPES));
      const solves = sessionTypes.map((t) => {
        const diff = weightedDifficulty();
        const elapsed = solveTimeFor(t, diff);
        const diffChange = pick(["up", "down", "stay"] as const);
        return { type: t, difficulty: diff, elapsed, diffChange };
      });
      const totalTime = solves.reduce((s, r) => s + r.elapsed, 0);
      const fastest = Math.min(...solves.map((s) => s.elapsed));
      const finalDiffs: Partial<Record<PuzzleCategory, Difficulty>> = {};
      for (const sv of solves) finalDiffs[sv.type] = sv.difficulty;

      demoSessions.push({
        id: `demo-endless-${Date.now()}-${s}`,
        date: d.toISOString(),
        totalSolved: solveCount,
        totalTime,
        fastestSolve: fastest,
        typesPlayed: [...new Set(sessionTypes)],
        solves,
        finalDifficulties: finalDiffs,
        __demo: true,
      });
    }
    demoSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(ENDLESS_KEY, JSON.stringify([...demoSessions, ...realEndless]));

    localStorage.setItem(DEMO_FLAG_KEY, "true");
  } catch {
    // Storage error — silently fail
  }
}

export function clearDemoSolves() {
  try {
    const solves = JSON.parse(localStorage.getItem(SOLVES_KEY) || "[]");
    localStorage.setItem(SOLVES_KEY, JSON.stringify(solves.filter((r: any) => !r.__demo)));

    const completions = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || "[]");
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions.filter((r: any) => !r.__demo)));

    // Clear demo daily completions
    const daily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
    const realDaily: Record<string, any> = {};
    for (const [k, v] of Object.entries(daily)) {
      if (!(v as any).__demo) realDaily[k] = v;
    }
    localStorage.setItem(DAILY_KEY, JSON.stringify(realDaily));

    // Clear demo endless sessions
    const endless = JSON.parse(localStorage.getItem(ENDLESS_KEY) || "[]");
    localStorage.setItem(ENDLESS_KEY, JSON.stringify(endless.filter((r: any) => !r.__demo)));

    localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    // Silently fail
  }
}

export function hasDemoData(): boolean {
  return localStorage.getItem(DEMO_FLAG_KEY) === "true";
}
