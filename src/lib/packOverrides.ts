/**
 * packOverrides.ts  ← FULL REPLACEMENT
 * src/lib/packOverrides.ts
 *
 * CHANGES FROM PREVIOUS VERSION:
 * - PackOverride now supports an optional `customThemeWords` array for
 *   admin-supplied word banks when the theme is custom/narrow.
 * - Adds a quality check comment per override showing estimated word coverage.
 * - Halloween and Thanksgiving dates corrected to current-year 2026.
 * - All other overrides unchanged.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONLY FILE YOU EDIT TO SCHEDULE A SPECIAL PACK.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The word content for each puzzle type is now automatically sourced from
 * weeklyThemeWordBanks.ts. If your theme is custom and not in the bank,
 * add a `customThemeWords` array here to provide your own word pool.
 *
 * Example with custom words:
 *   {
 *     from: "2026-08-01",
 *     to:   "2026-08-07",
 *     theme: "Taylor Swift",
 *     emoji: "🎤",
 *     description: "All the eras, albums, and iconic moments",
 *     customThemeWords: ["FOLKLORE", "FEARLESS", "SWIFTIES", "ERAS", "LAVENDER"],
 *     puzzles: [ ... ],
 *   }
 */

export interface PackOverridePuzzle {
  title:      string;
  type:       "crossword" | "word-search" | "sudoku" | "cryptogram" | "word-fill";
  difficulty: "easy" | "medium" | "hard";
}

export interface PackOverride {
  from:        string;
  to:          string;
  theme:       string;
  emoji:       string;
  description: string;
  /**
   * Optional custom word bank for themes not in weeklyThemeWordBanks.ts.
   * Provide at least 25 words for best results.
   * If omitted, the system looks up the theme name in weeklyThemeWordBanks.ts.
   */
  customThemeWords?: string[];
  puzzles: [
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED OVERRIDES
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEDULED_OVERRIDES: PackOverride[] = [

  // ── Halloween 2026 ────────────────────────────────────────────────
  // Word bank: "Halloween" in weeklyThemeWordBanks.ts (50 curated words)
  {
    from: "2026-10-26",
    to:   "2026-11-01",
    theme: "Halloween",
    emoji: "🎃",
    description: "Spooky puzzles for the scariest week of the year",
    puzzles: [
      { title: "Things that go bump",    type: "word-search", difficulty: "easy"   },
      { title: "Horror Classics",        type: "crossword",   difficulty: "medium" },
      { title: "Trick or Treat",         type: "word-fill",   difficulty: "medium" },
      { title: "Haunted Cryptogram",     type: "cryptogram",  difficulty: "hard"   },
      { title: "Monster Mash Sudoku",    type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Thanksgiving 2026 ─────────────────────────────────────────────
  // Word bank: "Thanksgiving" in weeklyThemeWordBanks.ts (42 curated words)
  {
    from: "2026-11-23",
    to:   "2026-11-29",
    theme: "Thanksgiving",
    emoji: "🦃",
    description: "Gratitude, feasts, and the traditions of the season",
    puzzles: [
      { title: "Feast Classics",         type: "word-search", difficulty: "easy"   },
      { title: "American Traditions",    type: "crossword",   difficulty: "medium" },
      { title: "Gratitude List",         type: "word-fill",   difficulty: "easy"   },
      { title: "Harvest Wisdom",         type: "cryptogram",  difficulty: "medium" },
      { title: "Turkey Day Sudoku",      type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Christmas 2026 ────────────────────────────────────────────────
  // Word bank: "Christmas" in weeklyThemeWordBanks.ts (47 curated words)
  {
    from: "2026-12-21",
    to:   "2026-12-27",
    theme: "Christmas",
    emoji: "🎄",
    description: "Festive puzzles to play between mince pies",
    puzzles: [
      { title: "Christmas Classics",     type: "word-search", difficulty: "easy"   },
      { title: "Carols and Songs",       type: "crossword",   difficulty: "medium" },
      { title: "Twelve Days",            type: "word-fill",   difficulty: "medium" },
      { title: "Christmas Quote",        type: "cryptogram",  difficulty: "hard"   },
      { title: "Festive Sudoku",         type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── New Year 2026–27 ──────────────────────────────────────────────
  // Word bank: "New Year" in weeklyThemeWordBanks.ts (44 curated words)
  {
    from: "2026-12-28",
    to:   "2027-01-03",
    theme: "New Year",
    emoji: "🎉",
    description: "Ring out the old, ring in the new",
    puzzles: [
      { title: "Year in Review",         type: "word-search", difficulty: "easy"   },
      { title: "Resolutions",            type: "crossword",   difficulty: "medium" },
      { title: "Fresh Starts",           type: "word-fill",   difficulty: "easy"   },
      { title: "New Year Wisdom",        type: "cryptogram",  difficulty: "medium" },
      { title: "Countdown Sudoku",       type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Valentine's Day 2027 ──────────────────────────────────────────
  // Word bank: "Valentine's Week" in weeklyThemeWordBanks.ts (43 curated words)
  {
    from: "2027-02-10",
    to:   "2027-02-16",
    theme: "Valentine's Week",
    emoji: "❤️",
    description: "Love-themed puzzles to share with someone special",
    puzzles: [
      { title: "Greatest Love Songs",    type: "crossword",   difficulty: "easy"   },
      { title: "Romantic Movies",        type: "word-search", difficulty: "easy"   },
      { title: "Love Languages",         type: "word-fill",   difficulty: "medium" },
      { title: "Shakespeare's Sonnets",  type: "cryptogram",  difficulty: "hard"   },
      { title: "Heart Sudoku",           type: "sudoku",      difficulty: "medium" },
    ],
  },

  // ── St Patrick's Day 2027 ─────────────────────────────────────────
  // Word bank: "St Patrick's Day" in weeklyThemeWordBanks.ts (47 curated words)
  {
    from: "2027-03-14",
    to:   "2027-03-20",
    theme: "St Patrick's Day",
    emoji: "☘️",
    description: "Irish culture, folklore, and all things green",
    puzzles: [
      { title: "Irish Mythology",        type: "crossword",   difficulty: "medium" },
      { title: "Cities of Ireland",      type: "word-search", difficulty: "easy"   },
      { title: "Luck of the Irish",      type: "word-fill",   difficulty: "easy"   },
      { title: "Gaelic Proverbs",        type: "cryptogram",  difficulty: "hard"   },
      { title: "Shamrock Sudoku",        type: "sudoku",      difficulty: "medium" },
    ],
  },

  // ── The Masters 2027 ──────────────────────────────────────────────
  // Word bank: "The Masters" in weeklyThemeWordBanks.ts (50 curated words)
  {
    from: "2027-04-05",
    to:   "2027-04-13",
    theme: "The Masters",
    emoji: "⛳",
    description: "Augusta National, green jackets, and golf greatness",
    puzzles: [
      { title: "Masters Champions",      type: "crossword",   difficulty: "medium" },
      { title: "Golf Terminology",       type: "word-search", difficulty: "easy"   },
      { title: "Augusta Holes",          type: "word-fill",   difficulty: "medium" },
      { title: "Caddie Wisdom",          type: "cryptogram",  difficulty: "hard"   },
      { title: "Par 72 Sudoku",          type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Super Bowl 2027 ───────────────────────────────────────────────
  // Word bank: "Super Bowl Week" in weeklyThemeWordBanks.ts (45 curated words)
  {
    from: "2027-02-01",
    to:   "2027-02-07",
    theme: "Super Bowl Week",
    emoji: "🏈",
    description: "All the football knowledge you need before the big game",
    puzzles: [
      { title: "Legendary Quarterbacks", type: "crossword",   difficulty: "medium" },
      { title: "Super Bowl Champions",   type: "word-search", difficulty: "easy"   },
      { title: "Stadium Trivia",         type: "word-fill",   difficulty: "medium" },
      { title: "Halftime Cryptogram",    type: "cryptogram",  difficulty: "hard"   },
      { title: "Fourth Quarter Sudoku",  type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Summer Olympics 2028 ──────────────────────────────────────────
  // Word bank: "The Olympics" in weeklyThemeWordBanks.ts (48 curated words)
  {
    from: "2028-07-14",
    to:   "2028-08-12",
    theme: "The Olympics",
    emoji: "🥇",
    description: "Celebrate the greatest sporting event on earth",
    puzzles: [
      { title: "Olympic Host Cities",    type: "crossword",   difficulty: "medium" },
      { title: "Summer Sports A to Z",   type: "word-search", difficulty: "easy"   },
      { title: "Greatest Athletes",      type: "word-fill",   difficulty: "medium" },
      { title: "Olympic Creed",          type: "cryptogram",  difficulty: "hard"   },
      { title: "Gold Medal Sudoku",      type: "sudoku",      difficulty: "hard"   },
    ],
  },

];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP — used by weeklyPacks.ts
// ─────────────────────────────────────────────────────────────────────────────

export function getActiveOverride(date: Date): PackOverride | null {
  const dateStr = date.toISOString().slice(0, 10);
  return (
    SCHEDULED_OVERRIDES.find(
      (o) => dateStr >= o.from && dateStr <= o.to
    ) ?? null
  );
}
