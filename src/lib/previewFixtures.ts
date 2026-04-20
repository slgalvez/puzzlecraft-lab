/**
 * Deterministic fixture builders for admin QA Preview Mode.
 * All records are tagged `__preview: true` and never persisted.
 *
 * Date safety: every YYYY-MM-DD → Date conversion uses "T12:00:00"
 * to avoid UTC/DST shifts in non-UTC environments.
 */
import type { CompletionRecord } from "@/lib/progressTracker";
import type { SolveRecord } from "@/lib/solveTracker";
import type { DailyCompletion } from "@/lib/dailyChallenge";
import type { PuzzleCategory, Difficulty } from "@/lib/puzzleTypes";
import { localDateStr } from "@/lib/calendarActivity";

export type PreviewScenario =
  | "none"
  | "partial"
  | "full"
  | "daily-only"
  | "quickplay-only"
  | "craft-only"
  | "mixed";

export type FriendsVariant = "populated" | "tie" | "small" | "empty";

const CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "extreme"];

/* ── Seeded RNG (deterministic) ── */

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/* ── Calendar fixture ── */

export interface CalendarFixture {
  completions: CompletionRecord[];
  solves: SolveRecord[];
  dailyData: Record<string, DailyCompletion>;
  craftDates: string[];
}

/**
 * Build a calendar fixture spanning the last 60 days for the given scenario.
 * Records use local-midday date keys for safe display in any timezone.
 */
export function buildCalendarFixture(scenario: PreviewScenario): CalendarFixture {
  const completions: CompletionRecord[] = [];
  const solves: SolveRecord[] = [];
  const dailyData: Record<string, DailyCompletion> = {};
  const craftDates: string[] = [];

  if (scenario === "none") {
    return { completions, solves, dailyData, craftDates };
  }

  const rng = mulberry32(42);
  const days = 60;

  // Density per scenario
  const dailyChance = scenario === "full" ? 0.9
    : scenario === "daily-only" ? 0.65
    : scenario === "mixed" ? 0.5
    : scenario === "partial" ? 0.3
    : 0;

  const puzzleChance = scenario === "full" ? 0.85
    : scenario === "quickplay-only" ? 0.7
    : scenario === "mixed" ? 0.55
    : scenario === "partial" ? 0.35
    : 0;

  const craftChance = scenario === "full" ? 0.4
    : scenario === "craft-only" ? 0.55
    : scenario === "mixed" ? 0.25
    : scenario === "partial" ? 0.15
    : 0;

  for (let i = 0; i < days; i++) {
    const d = dateNDaysAgo(i);
    const key = localDateStr(d);
    const iso = d.toISOString();

    // Daily completion
    if (rng() < dailyChance) {
      const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
      const difficulty = DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)];
      const time = 60 + Math.floor(rng() * 540);
      dailyData[key] = { dateStr: key, time, category, difficulty };
    }

    // Quick-play puzzles
    if (rng() < puzzleChance) {
      const count = 1 + Math.floor(rng() * 4);
      for (let j = 0; j < count; j++) {
        const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
        const difficulty = DIFFICULTIES[Math.floor(rng() * DIFFICULTIES.length)];
        const time = 30 + Math.floor(rng() * 600);
        completions.push({
          puzzleKey: `__preview-${i}-${j}`,
          category,
          difficulty,
          time,
          date: iso,
          assisted: false,
          // @ts-expect-error preview marker
          __preview: true,
        });
        solves.push({
          id: `__preview-solve-${i}-${j}`,
          puzzleId: `__preview-puzzle-${i}-${j}`,
          puzzleType: category,
          difficulty,
          solveTime: time,
          completedAt: iso,
          hintsUsed: rng() < 0.7 ? 0 : Math.floor(rng() * 3),
          mistakesCount: rng() < 0.6 ? 0 : Math.floor(rng() * 2),
          isDailyChallenge: false,
          assisted: false,
          __preview: true,
        } as SolveRecord & { __preview: boolean });
      }
    }

    // Craft sent
    if (rng() < craftChance) {
      craftDates.push(iso);
    }
  }

  return { completions, solves, dailyData, craftDates };
}

/* ── Friends fixture ── */

export interface MockFriend {
  id: string;
  displayName: string;
  rating: number | null;
  skillTier: string | null;
  solveCount: number;
  currentStreak: number;
}

export interface MockDailyEntry {
  friendId: string;
  displayName: string;
  solveTime: number;
  isMe: boolean;
}

export interface MockActivityItem {
  id: string;
  type: "daily_solve" | "craft_solve";
  actorName: string;
  puzzleType: string;
  solveTime: number | null;
  timestamp: Date;
  puzzleId?: string;
}

export interface FriendsFixture {
  friends: MockFriend[];
  daily: MockDailyEntry[];
  activity: MockActivityItem[];
}

const NAMES = ["Avery", "Bjorn", "Casey", "Devi", "Esme", "Finn", "Gita", "Hugo", "Iris", "Juno"];

export function buildFriendsFixture(variant: FriendsVariant): FriendsFixture {
  if (variant === "empty") {
    return { friends: [], daily: [], activity: [] };
  }

  const rng = mulberry32(variant === "tie" ? 7 : variant === "small" ? 3 : 11);
  const count = variant === "small" ? 2 : variant === "tie" ? 4 : 6;

  const friends: MockFriend[] = Array.from({ length: count }, (_, i) => {
    const rating = 600 + Math.floor(rng() * 1100);
    const tier = rating >= 1650 ? "Expert"
      : rating >= 1300 ? "Advanced"
      : rating >= 850 ? "Skilled"
      : rating >= 650 ? "Casual" : "Beginner";
    return {
      id: `__preview-friend-${i}`,
      displayName: NAMES[i % NAMES.length],
      rating,
      skillTier: tier,
      solveCount: 10 + Math.floor(rng() * 200),
      currentStreak: Math.floor(rng() * 30),
    };
  });

  // For "tie" variant, force first 3 to share the same solve time
  const tieTime = 240;
  const daily: MockDailyEntry[] = friends.slice(0, Math.min(count, 5)).map((f, i) => ({
    friendId: f.id,
    displayName: f.displayName,
    solveTime: variant === "tie" && i < 3 ? tieTime : 120 + Math.floor(rng() * 360),
    isMe: i === 1,
  })).sort((a, b) => a.solveTime - b.solveTime);

  const activity: MockActivityItem[] = friends.slice(0, 5).map((f, i) => ({
    id: `__preview-activity-${i}`,
    type: i % 2 === 0 ? "daily_solve" : "craft_solve",
    actorName: f.displayName,
    puzzleType: CATEGORIES[i % CATEGORIES.length],
    solveTime: 60 + Math.floor(rng() * 400),
    timestamp: new Date(Date.now() - i * 3600_000 * 4),
    puzzleId: i % 2 === 1 ? `__preview-puzzle-${i}` : undefined,
  }));

  return { friends, daily, activity };
}

/* ── Messaging fixture ── */

export interface MockMessage {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
  kind: "text" | "challenge" | "reveal" | "completion" | "milestone";
}

export function buildMessagingFixture(): MockMessage[] {
  const now = Date.now();
  return [
    { id: "m1", body: "Hey! Want to try this one?", isMine: false, createdAt: new Date(now - 600_000).toISOString(), kind: "text" },
    { id: "m2", body: "Sure, send it over 👀", isMine: true, createdAt: new Date(now - 540_000).toISOString(), kind: "text" },
    { id: "m3", body: "🧩 Crossword challenge — beat 3:42", isMine: false, createdAt: new Date(now - 480_000).toISOString(), kind: "challenge" },
    { id: "m4", body: "Solved! 3:21 ⏱️", isMine: true, createdAt: new Date(now - 300_000).toISOString(), kind: "completion" },
    { id: "m5", body: "🎉 Reveal: \"Coffee Run\"", isMine: false, createdAt: new Date(now - 240_000).toISOString(), kind: "reveal" },
    { id: "m6", body: "🏆 You hit a 7-day streak!", isMine: true, createdAt: new Date(now - 60_000).toISOString(), kind: "milestone" },
  ];
}

/* ── Milestone fixture ── */

export function buildMilestoneFixture(id = "streak-7") {
  return { id, label: "7-Day Streak", icon: "flame" as const };
}
