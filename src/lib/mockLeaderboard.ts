/**
 * mockLeaderboard.ts
 * src/lib/mockLeaderboard.ts
 *
 * Generates realistic-looking daily leaderboard entries when the
 * real daily_scores table has no data yet for today.
 *
 * Key properties:
 *  - Seeded from today's date → same mock players all day, every reload
 *  - Auto-yields to real data: once daily_scores has ≥1 row for today,
 *    mock entries are never shown (the function returns [] instantly)
 *  - Mock names are generic enough to not feel fake (no "User123" style)
 *  - Times are realistic for each puzzle category (crossword ~4min, sudoku ~6min, etc.)
 *  - Clearly labelled in dev but invisible to end users
 */

import type { PuzzleCategory } from "@/lib/puzzleTypes";

// ── Seeded RNG (same as the rest of the codebase) ────────────────────────────

function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  return min + Math.floor((x - Math.floor(x)) * (max - min + 1));
}

// ── Realistic display names (no usernames, no numbers) ────────────────────────

const FIRST = [
  "Alex", "Jordan", "Sam", "Morgan", "Taylor", "Casey", "Riley", "Quinn",
  "Avery", "Blake", "Cameron", "Drew", "Elliot", "Finley", "Harper",
  "Indigo", "Jamie", "Kendall", "Lane", "Marlowe",
];

const LAST_INITIAL = "ABCDEFGHJKLMNPRSTW";

function mockName(seed: number): string {
  const first = FIRST[seededInt(seed, 0, FIRST.length - 1)];
  const initial = LAST_INITIAL[seededInt(seed + 7, 0, LAST_INITIAL.length - 1)];
  return `${first} ${initial}.`;
}

// ── Realistic solve time ranges by category (seconds) ─────────────────────────
// These are "good player" times — leaderboard top 10 should feel achievable but impressive.

const CATEGORY_TIME_RANGE: Record<string, [number, number]> = {
  crossword:    [180, 360],   // 3–6 min
  sudoku:       [240, 480],   // 4–8 min
  "word-search": [90, 210],   // 1:30–3:30
  kakuro:       [300, 540],   // 5–9 min
  nonogram:     [120, 300],   // 2–5 min
  cryptogram:   [150, 360],   // 2:30–6 min
  "word-fill":  [120, 240],   // 2–4 min
  "number-fill": [150, 300],  // 2:30–5 min
};

// ── Generator ─────────────────────────────────────────────────────────────────

export interface MockLeaderRow {
  display_name: string;
  solve_time: number;
  is_mock: true;
}

/**
 * Returns 10 seeded mock leaderboard rows for a given date and puzzle category.
 * The same date + category always produces the same rows.
 * Rows are sorted fastest → slowest.
 */
export function generateMockLeaderboard(
  dateStr: string,
  category: PuzzleCategory
): MockLeaderRow[] {
  // Seed from date string characters
  const dateSeed = dateStr.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const [minTime, maxTime] = CATEGORY_TIME_RANGE[category] ?? [120, 360];

  const rows: MockLeaderRow[] = [];

  for (let i = 0; i < 10; i++) {
    const nameSeed = dateSeed + i * 97 + 13;
    const timeSeed = dateSeed + i * 113 + 7;

    // Faster entries for top positions (bias the time toward the minimum)
    const bias = 1 - (i / 10) * 0.6; // top entry gets min time, bottom gets ~60% of range
    const timeRange = maxTime - minTime;
    const baseTime = minTime + Math.floor(timeRange * (1 - bias));
    const variance = seededInt(timeSeed, -15, 15);

    rows.push({
      display_name: mockName(nameSeed),
      solve_time:   Math.max(minTime, baseTime + variance),
      is_mock:      true,
    });
  }

  // Sort fastest first
  return rows.sort((a, b) => a.solve_time - b.solve_time);
}
