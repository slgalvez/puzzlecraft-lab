import { getAllDailyCompletions, type DailyCompletion } from "@/lib/dailyChallenge";
import { getProgressStats } from "@/lib/progressTracker";
import { loadSentItems } from "@/lib/craftHistory";

/* ── Date normalization ── */

const pad = (n: number) => String(n).padStart(2, "0");

/** Normalize a Date to YYYY-MM-DD in local time. Single source of truth for date keys. */
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ── Types ── */

export type ActivityStatus = "daily-complete" | "puzzle-played" | "craft-only" | "none";

export interface ActivityDay {
  dateStr: string;
  dailyCompletion: DailyCompletion | null;
  puzzleCount: number;
  craftCount: number;
  status: ActivityStatus;
}

export type ActivityMap = Map<string, ActivityDay>;


/* ── Constants ── */

export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* ── Main aggregation ── */

/**
 * Build an ActivityMap for the last `days` days (inclusive of today).
 * Pre-fills every date in range with { status: 'none' } before merging.
 * Reads each localStorage source exactly once.
 */
export function getCalendarActivity(days: number): ActivityMap {
  const map: ActivityMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Pre-fill every date in range with 'none'
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    map.set(key, {
      dateStr: key,
      dailyCompletion: null,
      puzzleCount: 0,
      craftCount: 0,
      status: "none",
    });
  }

  // 2. Merge daily completions (single localStorage read)
  const dailyAll = getAllDailyCompletions();
  for (const [dateStr, completion] of Object.entries(dailyAll)) {
    const entry = map.get(dateStr);
    if (entry) {
      entry.dailyCompletion = completion;
    }
  }

  // 3. Merge quick-play completions (single localStorage read)
  const { recentCompletions } = getProgressStats();
  for (const rec of recentCompletions) {
    // Normalize: rec.date may be ISO string — convert to local YYYY-MM-DD
    const key = localDateStr(new Date(rec.date));
    const entry = map.get(key);
    if (entry) {
      entry.puzzleCount += 1;
    }
  }

  // 4. Merge craft sent items (single localStorage read)
  const sent = loadSentItems();
  for (const item of sent) {
    const key = localDateStr(new Date(item.sentAt));
    const entry = map.get(key);
    if (entry) {
      entry.craftCount += 1;
    }
  }

  // 5. Apply strict hierarchy
  for (const entry of map.values()) {
    if (entry.dailyCompletion) {
      entry.status = "daily-complete";
    } else if (entry.puzzleCount > 0) {
      entry.status = "puzzle-played";
    } else if (entry.craftCount > 0) {
      entry.status = "craft-only";
    }
    // else stays 'none'
  }

  return map;
}

/* ── View-as aggregation (from provided data, no localStorage) ── */

/**
 * Build an ActivityMap from provided completion and daily data arrays.
 * Used in admin view-as mode where localStorage is irrelevant.
 * Craft count stays 0 (not synced to backend).
 */
export function getCalendarActivityFrom(
  completions: Array<{ date: string }>,
  dailyData: Record<string, { dateStr: string; time: number; category: string; difficulty: string }>,
  days: number,
): ActivityMap {
  const map: ActivityMap = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Pre-fill every date in range with 'none'
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    map.set(key, {
      dateStr: key,
      dailyCompletion: null,
      puzzleCount: 0,
      craftCount: 0,
      status: "none",
    });
  }

  // 2. Merge daily completions from dailyData object
  for (const [dateStr, data] of Object.entries(dailyData)) {
    const entry = map.get(dateStr);
    if (entry && data) {
      entry.dailyCompletion = {
        dateStr: data.dateStr,
        time: data.time,
        category: data.category as any,
        difficulty: data.difficulty as any,
      };
    }
  }

  // 3. Merge quick-play completions
  for (const rec of completions) {
    const key = localDateStr(new Date(rec.date));
    const entry = map.get(key);
    if (entry) {
      entry.puzzleCount += 1;
    }
  }

  // 4. Apply strict hierarchy (same as getCalendarActivity)
  for (const entry of map.values()) {
    if (entry.dailyCompletion) {
      entry.status = "daily-complete";
    } else if (entry.puzzleCount > 0) {
      entry.status = "puzzle-played";
    }
    // craft stays 0, no craft-only possible
  }

  return map;
}

/* ── Monthly grid builder (Plus only) ── */

export interface MonthGrid {
  year: number;
  month: number; // 0-indexed
  rows: (ActivityDay | null)[][];
}

/**
 * Build a Sun–Sat monthly grid from the ActivityMap.
 * Leading/trailing null cells for calendar alignment.
 */
export function buildMonthGrid(map: ActivityMap, year: number, month: number): MonthGrid {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const cells: (ActivityDay | null)[] = [];

  // Leading nulls
  for (let i = 0; i < startDow; i++) cells.push(null);

  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = localDateStr(new Date(year, month, d));
    const existing = map.get(key);
    cells.push(existing ?? {
      dateStr: key,
      dailyCompletion: null,
      puzzleCount: 0,
      craftCount: 0,
      status: "none",
    });
  }

  // Trailing nulls to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (ActivityDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return { year, month, rows };
}

/**
 * Get the earliest date string in the supported replay/history window.
 */
export function getReplayBounds(isPlus: boolean): { earliest: string } {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (isPlus ? 59 : 0));
  return { earliest: localDateStr(d) };
}
