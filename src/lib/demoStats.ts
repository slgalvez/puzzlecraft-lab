/**
 * demoStats.ts  ← PATCH (additions only — full file for clarity)
 * src/lib/demoStats.ts
 *
 * CHANGES:
 * 1. Added cleanupDemoFlagForNonAdmin() — call this in PremiumStats on
 *    mount when the viewer is not an admin. Silently clears the
 *    puzzlecraft-demo-active flag so it doesn't affect future sessions
 *    on shared devices.
 *
 * 2. hasDemoData() — unchanged, but documented clearly: only meaningful
 *    for admin users. Non-admin callers should never act on this value.
 *
 * All other code is identical to previous version.
 */
import type { PuzzleCategory, Difficulty } from "./puzzleTypes";
import { supabase } from "@/integrations/supabase/client";

const SOLVES_KEY           = "puzzlecraft-solves";
const COMPLETIONS_KEY      = "puzzlecraft-completions";
const DAILY_KEY            = "puzzlecraft-daily-completions";
const ENDLESS_KEY          = "puzzlecraft_endless_sessions";
const DEMO_FLAG_KEY        = "puzzlecraft-demo-active";
const DEMO_LEADERBOARD_KEY = "puzzlecraft-demo-leaderboard";

const TYPES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

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

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
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
function dateToStr(d: Date): string { return d.toISOString().slice(0, 10); }
function solveTimeFor(type: PuzzleCategory, diff: Difficulty): number {
  const r = TIME_RANGES[type];
  const i = diff === "easy" ? 0 : diff === "medium" ? 2 : 4;
  return rand(r[i], r[i + 1]);
}

export function generateDemoSolves(count = 25) {
  const solveRecords:      any[] = [];
  const completionRecords: any[] = [];

  for (let i = 0; i < count; i++) {
    const type       = pick(TYPES);
    const difficulty = weightedDifficulty();
    const solveTime  = solveTimeFor(type, difficulty);
    const daysAgo    = rand(0, 20);
    const completedAt = generateTimestamp(daysAgo);
    const mistakesCount = Math.random() < 0.6 ? 0 : rand(1, 3);
    const hintsUsed  = Math.random() < 0.7 ? 0 : rand(1, 2);
    const assisted   = hintsUsed > 0;
    const id         = `demo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    const r          = Math.random();
    const isDailyChallenge = r < 0.2;
    const origin: "play" | "daily" | "endless" | "library" =
      r < 0.2 ? "daily" : r < 0.4 ? "endless" : pick(["play", "library"] as const);

    solveRecords.push({
      id, puzzleId: `demo-${type}-${difficulty}-${i}`, puzzleType: type,
      difficulty, solveTime, mistakesCount, hintsUsed, completedAt,
      isDailyChallenge, assisted, origin, __demo: true,
    });
    completionRecords.push({
      puzzleKey: `demo-${type}-${difficulty}-${i}`, category: type,
      difficulty, time: solveTime, date: completedAt, assisted, __demo: true,
    });
  }

  solveRecords.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  completionRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  try {
    const existingSolves = JSON.parse(localStorage.getItem(SOLVES_KEY) || "[]");
    localStorage.setItem(SOLVES_KEY, JSON.stringify([...solveRecords, ...existingSolves.filter((r: any) => !r.__demo)]));

    const existingCompletions = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || "[]");
    localStorage.setItem(COMPLETIONS_KEY, JSON.stringify([...existingCompletions.filter((r: any) => !r.__demo), ...completionRecords]));

    const existingDaily = JSON.parse(localStorage.getItem(DAILY_KEY) || "{}");
    const realDaily: Record<string, any> = {};
    for (const [k, v] of Object.entries(existingDaily)) {
      if (!(v as any).__demo) realDaily[k] = v;
    }
    const dailyCount = rand(8, 12);
    const usedDays   = new Set<number>();
    for (let i = 0; i < dailyCount; i++) {
      let day: number;
      do { day = rand(0, 20); } while (usedDays.has(day));
      usedDays.add(day);
      const d = new Date();
      d.setDate(d.getDate() - day);
      const dateStr = dateToStr(d);
      const t = pick(TYPES);
      const diff = weightedDifficulty();
      realDaily[dateStr] = { dateStr, time: solveTimeFor(t, diff), category: t, difficulty: diff, __demo: true };
    }
    localStorage.setItem(DAILY_KEY, JSON.stringify(realDaily));

    const existingEndless = JSON.parse(localStorage.getItem(ENDLESS_KEY) || "[]");
    const demoSessions: any[] = [];
    const sessionCount = rand(3, 5);
    for (let s = 0; s < sessionCount; s++) {
      const daysAgo = rand(0, 18);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(rand(10, 21), rand(0, 59), rand(0, 59));
      const solveCount    = rand(3, 8);
      const sessionTypes  = Array.from({ length: solveCount }, () => pick(TYPES));
      const solves        = sessionTypes.map((t) => {
        const diff    = weightedDifficulty();
        const elapsed = solveTimeFor(t, diff);
        return { type: t, difficulty: diff, elapsed, diffChange: pick(["up", "down", "stay"] as const) };
      });
      demoSessions.push({
        id: `demo-endless-${Date.now()}-${s}`,
        date: d.toISOString(), totalSolved: solveCount,
        totalTime: solves.reduce((s, r) => s + r.elapsed, 0),
        fastestSolve: Math.min(...solves.map((s) => s.elapsed)),
        typesPlayed: [...new Set(sessionTypes)], solves, __demo: true,
      });
    }
    demoSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(ENDLESS_KEY, JSON.stringify([...demoSessions, ...existingEndless.filter((r: any) => !r.__demo)]));

    localStorage.setItem(DEMO_FLAG_KEY, "true");
  } catch {}
}

export function clearDemoSolves() {
  try {
    const clean = (key: string, isObj = false) => {
      if (isObj) {
        const obj = JSON.parse(localStorage.getItem(key) || "{}");
        const real: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) { if (!(v as any).__demo) real[k] = v; }
        localStorage.setItem(key, JSON.stringify(real));
      } else {
        const arr = JSON.parse(localStorage.getItem(key) || "[]");
        localStorage.setItem(key, JSON.stringify(arr.filter((r: any) => !r.__demo)));
      }
    };
    clean(SOLVES_KEY);
    clean(COMPLETIONS_KEY);
    clean(DAILY_KEY, true);
    clean(ENDLESS_KEY);
    localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {}
}

/**
 * Returns true if demo data was generated in this browser.
 * Only meaningful for admin users — non-admin callers should ignore this.
 * Use cleanupDemoFlagForNonAdmin() on mount if the caller is not admin.
 */
export function hasDemoData(): boolean {
  return localStorage.getItem(DEMO_FLAG_KEY) === "true";
}

/**
 * NEW — Silently clears the demo flag when a non-admin user's session
 * loads. Prevents flag leakage from admin sessions on shared devices.
 * Call on mount in any component that checks hasDemoData().
 */
export function cleanupDemoFlagForNonAdmin(): void {
  try {
    if (localStorage.getItem(DEMO_FLAG_KEY) === "true") {
      // Clear the flag (but not the actual records — they're already filtered
      // by the __demo flag in getSolveRecords for non-admin callers)
      localStorage.removeItem(DEMO_FLAG_KEY);
    }
  } catch {}
}

// ── Demo Leaderboard ──────────────────────────────────────────────────────

const DEMO_USERNAMES = [
  "PuzzleMaster99", "GridNinja", "WordSmithX", "SudokuSage", "CrossKing",
  "BrainBolt", "TileRunner", "ClueHunter", "LogicLion", "NumberWiz",
  "PatternPro", "MindMaze", "AceSolver", "CipherQueen", "GridGuru",
];

function tierForRating(r: number): string {
  if (r >= 1650) return "Expert";
  if (r >= 1300) return "Advanced";
  if (r >= 850)  return "Skilled";
  if (r >= 650)  return "Casual";
  return "Beginner";
}

export async function generateDemoLeaderboard(count = 12) {
  const ratings = [1350, 1180, 1050, 980, 920, 870, 810, 750, 680, 620, 540, 450, 1280, 1100, 960].slice(0, count);
  const entries = ratings.map((rating, i) => ({
    user_id:      `00000000-0000-0000-demo-${String(i).padStart(12, "0")}`,
    display_name: DEMO_USERNAMES[i] ?? `Demo${i}`,
    rating,
    previous_rating: rating + (Math.random() < 0.5 ? -1 : 1) * rand(5, 40),
    skill_tier:  tierForRating(rating),
    solve_count: rand(15, 120),
    updated_at:  new Date().toISOString(),
  }));

  const results = await Promise.allSettled(
    entries.map((e) =>
      supabase.rpc("upsert_leaderboard_entry" as any, {
        p_user_id:        e.user_id,
        p_display_name:   e.display_name,
        p_rating:         e.rating,
        p_previous_rating:e.previous_rating,
        p_skill_tier:     e.skill_tier,
        p_solve_count:    e.solve_count,
      })
    )
  );

  if (results.some((r) => r.status === "fulfilled")) {
    localStorage.setItem(DEMO_LEADERBOARD_KEY, JSON.stringify(entries.map((e) => e.user_id)));
  }
}

export async function clearDemoLeaderboard() {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(DEMO_LEADERBOARD_KEY) || "[]");
    if (ids.length > 0) {
      await supabase.from("leaderboard_entries").delete().in("user_id", ids);
    }
    localStorage.removeItem(DEMO_LEADERBOARD_KEY);
  } catch {}
}

export function hasDemoLeaderboard(): boolean {
  try {
    const ids = JSON.parse(localStorage.getItem(DEMO_LEADERBOARD_KEY) || "[]");
    return ids.length > 0;
  } catch { return false; }
}
