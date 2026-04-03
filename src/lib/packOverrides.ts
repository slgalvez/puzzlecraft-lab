/**
 * packOverrides.ts
 * src/lib/packOverrides.ts
 *
 * ─────────────────────────────────────────────────────────────────
 * THIS IS THE ONLY FILE YOU EDIT TO SCHEDULE A SPECIAL PACK.
 * ─────────────────────────────────────────────────────────────────
 *
 * Add an entry to SCHEDULED_OVERRIDES with:
 *   - from / to  : the date range this pack should run (inclusive)
 *   - theme      : the headline shown on the card
 *   - emoji      : one emoji shown on the card
 *   - description: one sentence shown under the theme name
 *   - puzzles    : exactly 5 puzzles, each with a title, type, and difficulty
 *
 * The override replaces the auto-generated pack for any week that
 * falls within the date range. Outside those dates the automatic
 * rotation resumes with no changes needed.
 *
 * ADDING A NEW SPECIAL PACK — example:
 *
 *   {
 *     from: "2026-10-26",
 *     to:   "2026-11-01",
 *     theme: "Halloween",
 *     emoji: "🎃",
 *     description: "Spooky puzzles for the scariest week of the year",
 *     puzzles: [
 *       { title: "Things that go bump",  type: "word-search",  difficulty: "easy"   },
 *       { title: "Horror Classics",      type: "crossword",    difficulty: "medium" },
 *       { title: "Trick or Treat",       type: "word-fill",    difficulty: "medium" },
 *       { title: "Haunted Cryptogram",   type: "cryptogram",   difficulty: "hard"   },
 *       { title: "Monster Mash Sudoku",  type: "sudoku",       difficulty: "hard"   },
 *     ],
 *   },
 */

export interface PackOverridePuzzle {
  title: string;
  type: "crossword" | "word-search" | "sudoku" | "cryptogram" | "word-fill";
  difficulty: "easy" | "medium" | "hard";
}

export interface PackOverride {
  /** Start date — "YYYY-MM-DD", inclusive */
  from: string;
  /** End date — "YYYY-MM-DD", inclusive */
  to: string;
  theme: string;
  emoji: string;
  description: string;
  /** Exactly 5 puzzles */
  puzzles: [
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
    PackOverridePuzzle,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD YOUR SPECIAL PACKS HERE
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEDULED_OVERRIDES: PackOverride[] = [

  // ── Super Bowl (first Sunday in February) ─────────────────────────
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

  // ── Valentine's Day ───────────────────────────────────────────────
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

  // ── St Patrick's Day ──────────────────────────────────────────────
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

  // ── Masters Tournament (first full week of April) ─────────────────
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

  // ── Summer Olympics 2028 ──────────────────────────────────────────
  {
    from: "2028-07-14",
    to:   "2028-08-12",
    theme: "The Olympics",
    emoji: "🥇",
    description: "Celebrate the greatest sporting event on earth",
    puzzles: [
      { title: "Olympic Host Cities",    type: "crossword",   difficulty: "medium" },
      { title: "Summer Sports A–Z",      type: "word-search", difficulty: "easy"   },
      { title: "Greatest Athletes",      type: "word-fill",   difficulty: "medium" },
      { title: "Olympic Creed",          type: "cryptogram",  difficulty: "hard"   },
      { title: "Gold Medal Sudoku",      type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── Halloween ─────────────────────────────────────────────────────
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

  // ── Thanksgiving ──────────────────────────────────────────────────
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

  // ── Christmas ─────────────────────────────────────────────────────
  {
    from: "2026-12-21",
    to:   "2026-12-27",
    theme: "Christmas",
    emoji: "🎄",
    description: "Festive puzzles to play between mince pies",
    puzzles: [
      { title: "Christmas Classics",     type: "word-search", difficulty: "easy"   },
      { title: "Carols & Songs",         type: "crossword",   difficulty: "medium" },
      { title: "Twelve Days",            type: "word-fill",   difficulty: "medium" },
      { title: "Christmas Quote",        type: "cryptogram",  difficulty: "hard"   },
      { title: "Festive Sudoku",         type: "sudoku",      difficulty: "hard"   },
    ],
  },

  // ── New Year ──────────────────────────────────────────────────────
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

];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTION — used by weeklyPacks.ts, don't edit this
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the active override for a given date, or null if none.
 * Called automatically by getCurrentWeeklyPack().
 */
export function getActiveOverride(date: Date): PackOverride | null {
  const dateStr = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return (
    SCHEDULED_OVERRIDES.find(
      (o) => dateStr >= o.from && dateStr <= o.to
    ) ?? null
  );
}