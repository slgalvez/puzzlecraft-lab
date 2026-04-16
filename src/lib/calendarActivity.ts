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

export interface CalendarWeek {
  days: ActivityDay[]; // always length 7 (Sun–Sat)
}

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

/* ── Week grid builder (Plus only) ── */

/**
 * Build a Sun–Sat week grid from the ActivityMap.
 * Always produces complete 7-day weeks — pads the first and last week.
 */
export function buildCalendarWeeks(map: ActivityMap, days: number): CalendarWeek[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Compute the date range
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (days - 1));

  // Pad start to previous Sunday
  const startDow = startDate.getDay(); // 0=Sun
  const gridStart = new Date(startDate);
  gridStart.setDate(gridStart.getDate() - startDow);

  // Pad end to next Saturday
  const endDate = new Date(today);
  const endDow = endDate.getDay();
  const gridEnd = new Date(endDate);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDow));

  const weeks: CalendarWeek[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = localDateStr(cursor);
      const existing = map.get(key);
      if (existing) {
        week.push(existing);
      } else {
        // Padding day outside the requested range
        week.push({
          dateStr: key,
          dailyCompletion: null,
          puzzleCount: 0,
          craftCount: 0,
          status: "none",
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ days: week });
  }

  return weeks;
}
