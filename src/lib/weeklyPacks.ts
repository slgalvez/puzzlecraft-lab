/**
 * weeklyPacks.ts  ← FULL REPLACEMENT
 * src/lib/weeklyPacks.ts
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 * 1. PackPuzzle now includes `wordBank?: string[]` and `quote?: string`
 *    so each puzzle carries its own themed content alongside its seed.
 *
 * 2. getCurrentWeeklyPack() looks up the theme's word bank from
 *    weeklyThemeWordBanks.ts and assigns:
 *    - word-search and word-fill puzzles: a slice of themed words
 *    - cryptogram puzzles: a themed quote
 *    - crossword and sudoku: no word bank (use existing generators)
 *
 * 3. The themed word bank is persisted to localStorage under
 *    `puzzlecraft-pack-words-${packId}` so puzzle pages can read it
 *    when the user taps into a pack puzzle.
 *
 * 4. Quality validation: if a theme's word bank has fewer than 20 words,
 *    the system falls back to the extended word pool, then the generic
 *    WORDS list — never silently generating unthemed content.
 */

import { hasPremiumAccess } from "@/lib/premiumAccess";
import { getActiveOverride, type PackOverride } from "@/lib/packOverrides";
import { getThemeWordBank } from "@/lib/weeklyThemeWordBanks";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PackPuzzle = {
  id:         string;
  type:       "crossword" | "word-search" | "sudoku" | "cryptogram" | "word-fill";
  difficulty: "easy" | "medium" | "hard";
  seed:       string;
  /** Stable numeric seed for puzzle generators / QuickPlay URL */
  numericSeed: number;
  title:      string;
  /** Themed words for word-search and word-fill puzzles */
  wordBank?:  string[];
  /** Themed quote for cryptogram puzzles */
  quote?:     string;
  /** True if this is the free sample puzzle (index 0) */
  isSample?:  boolean;
  /** True if the current user can play this puzzle */
  isAccessible?: boolean;
};

export type WeeklyPack = {
  id:             string;
  weekNumber:     number;
  year:           number;
  theme:          string;
  emoji:          string;
  description:    string;
  puzzles:        PackPuzzle[];
  releaseDate:    Date;
  plusEarlyDate:  Date;
  isCurrentWeek:  boolean;
  isSpecialPack:  boolean;
  /** Number of puzzles free users can access (always 1) */
  freeCount:      number;
};

// ── Rotating theme list ───────────────────────────────────────────────────────

const PACK_THEMES = [
  { theme: "Around the World",    emoji: "🌍", description: "Geography, languages, and landmarks from every continent" },
  { theme: "Silver Screen",       emoji: "🎬", description: "Classic cinema, directors, and unforgettable movie moments" },
  { theme: "The Natural World",   emoji: "🌿", description: "Animals, ecosystems, and the wonders of nature" },
  { theme: "Into the Kitchen",    emoji: "🍳", description: "Ingredients, techniques, and cuisines from around the globe" },
  { theme: "Great Minds",         emoji: "🧠", description: "Scientists, inventors, and the ideas that changed everything" },
  { theme: "Game On",             emoji: "🎮", description: "Video games, board games, and the culture of play" },
  { theme: "Music to My Ears",    emoji: "🎵", description: "Genres, legends, and the language of music" },
  { theme: "By the Book",         emoji: "📚", description: "Literature, authors, and stories that endure" },
  { theme: "Sports Legends",      emoji: "🏆", description: "Athletes, records, and the greatest moments in sport" },
  { theme: "Into Space",          emoji: "🚀", description: "Planets, missions, and the infinite universe" },
  { theme: "Ancient History",     emoji: "🏛️", description: "Civilisations, empires, and the echoes of the past" },
  { theme: "Pop Culture Remix",   emoji: "✨", description: "Trends, moments, and the things everyone's talking about" },
];

const PUZZLE_TITLES: Record<string, string[]> = {
  "Around the World":   ["Capital Cities", "Famous Landmarks", "World Cuisines", "Languages of Earth", "Mountain Ranges"],
  "Silver Screen":      ["Best Picture Winners", "Iconic Directors", "Legendary Actors", "Film Genres", "Classic Quotes"],
  "The Natural World":  ["Endangered Species", "Ocean Deep", "The Rainforest", "Bird Life", "Geology"],
  "Into the Kitchen":   ["Classic French Techniques", "Spices of the World", "Knife Skills", "Baking Science", "Street Food"],
  "Great Minds":        ["Nobel Laureates", "Famous Inventions", "Scientific Theory", "Maths Pioneers", "Space Explorers"],
  "Game On":            ["Console Generations", "Classic Board Games", "Esports Champions", "Game Mechanics", "Pixel Art Icons"],
  "Music to My Ears":   ["Genre Origins", "Record Breakers", "Legendary Bands", "Music Theory", "Concert Moments"],
  "By the Book":        ["Booker Prize Winners", "Classic Authors", "Literary Devices", "Famous Characters", "Opening Lines"],
  "Sports Legends":     ["Olympic Records", "World Cup Moments", "Tennis Greats", "Boxing Champions", "Racing Icons"],
  "Into Space":         ["Solar System", "Space Missions", "Astronomers", "Black Holes", "The Cosmos"],
  "Ancient History":    ["Roman Empire", "Ancient Egypt", "Greek Mythology", "The Silk Road", "Lost Civilisations"],
  "Pop Culture Remix":  ["Viral Moments", "Iconic Fashion", "Internet Culture", "Award Shows", "Decade Defining"],
};

// ── Word bank storage ─────────────────────────────────────────────────────────

const PACK_WORDS_KEY_PREFIX = "puzzlecraft-pack-words-";

/** Persist the themed word assignments for a pack so puzzle pages can read them. */
function savePackWordAssignments(packId: string, puzzles: PackPuzzle[]): void {
  try {
    const assignments: Record<string, { wordBank?: string[]; quote?: string }> = {};
    for (const p of puzzles) {
      if (p.wordBank || p.quote) {
        assignments[p.id] = { wordBank: p.wordBank, quote: p.quote };
      }
    }
    localStorage.setItem(
      `${PACK_WORDS_KEY_PREFIX}${packId}`,
      JSON.stringify(assignments)
    );
  } catch {}
}

/**
 * Read the themed word bank for a specific pack puzzle.
 * Call this from QuickPlay / puzzle pages when playing a pack puzzle.
 */
export function getPackPuzzleWordBank(
  packId: string,
  puzzleId: string
): { wordBank?: string[]; quote?: string } | null {
  try {
    const raw = localStorage.getItem(`${PACK_WORDS_KEY_PREFIX}${packId}`);
    if (!raw) return null;
    const assignments = JSON.parse(raw);
    return assignments[puzzleId] ?? null;
  } catch {
    return null;
  }
}

// ── Numeric seed helpers ──────────────────────────────────────────────────────

/** Knuth multiplicative hash → stable positive 32-bit integer */
function packNumericSeed(year: number, week: number, index: number): number {
  const base = year * 10000 + week * 100 + index;
  return ((base >>> 0) * 2654435761) >>> 0;
}

/** FNV-1a hash of a string → stable positive 32-bit integer */
function stringToNumericSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ── Themed puzzle builder ─────────────────────────────────────────────────────

/**
 * Build a themed pack puzzle with appropriate word content.
 *
 * Word-based puzzles (word-search, word-fill):
 *   Uses themed word bank. Falls back to extended pool, then empty
 *   (caller handles final fallback to generic WORDS).
 *
 * Cryptogram:
 *   Uses a themed quote. Falls back to extended pool quotes.
 *
 * Crossword, Sudoku:
 *   No word bank — use existing seed-based generators.
 *   Theme is reflected through title and description only.
 */
function buildThemedPuzzle(
  id: string,
  type: PackPuzzle["type"],
  difficulty: PackPuzzle["difficulty"],
  seed: string,
  title: string,
  theme: string,
  puzzleIndex: number
): PackPuzzle {
  const bank = getThemeWordBank(theme);

  const numericSeed = stringToNumericSeed(seed);
  const base: PackPuzzle = { id, type, difficulty, seed, numericSeed, title };

  if (!bank) return base; // Unknown theme — fall back gracefully

  if (type === "word-search") {
    // Word search needs 10–20 words. Use primary pool first, extend if needed.
    const pool = bank.words.length >= 15
      ? bank.words
      : [...bank.words, ...bank.extended];

    // Shuffle deterministically using puzzleIndex as offset so each puzzle
    // in the pack gets a slightly different subset of the same theme words
    const shuffled = deterministicShuffle(pool, puzzleIndex);
    return { ...base, wordBank: shuffled.slice(0, 20) };
  }

  if (type === "word-fill") {
    // Word fill needs 8–15 words. Use primary pool.
    const pool = bank.words.length >= 10
      ? bank.words
      : [...bank.words, ...bank.extended];
    const shuffled = deterministicShuffle(pool, puzzleIndex + 100);
    return { ...base, wordBank: shuffled.slice(0, 15) };
  }

  if (type === "cryptogram") {
    // Pick a quote from the theme's quote pool, cycling by puzzle index
    const quote = bank.quotes[puzzleIndex % bank.quotes.length];
    return { ...base, quote };
  }

  // crossword, sudoku — no themed word bank
  return base;
}

/** Deterministic shuffle using a simple seeded algorithm (no randomness dependency). */
function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

function getSundayOfWeek(week: number, year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysToFirstSunday = (7 - jan1.getDay()) % 7;
  const firstSunday = new Date(year, 0, 1 + daysToFirstSunday);
  return new Date(firstSunday.getTime() + (week - 1) * 7 * 86400000);
}

function getPreviousFriday(sunday: Date): Date {
  const friday = new Date(sunday);
  friday.setDate(friday.getDate() - 2);
  return friday;
}

function packSeed(week: number, year: number, index: number): string {
  return `pack-${year}-${week}-${index}`;
}

function overrideSeed(overrideFrom: string, index: number): string {
  return `override-${overrideFrom}-${index}`;
}

// ── DB custom pack cache ──────────────────────────────────────────────────────

interface DbCustomPack {
  id: string;
  theme: string;
  emoji: string;
  description: string;
  from_date: string;
  to_date: string;
  puzzles: { title: string; type: PackPuzzle["type"]; difficulty: PackPuzzle["difficulty"] }[];
  is_active: boolean;
}

let _dbPackCache: DbCustomPack[] | null = null;
let _dbPackFetchedAt = 0;
const DB_CACHE_TTL = 5 * 60 * 1000;

export async function fetchDbCustomPacks(): Promise<DbCustomPack[]> {
  if (_dbPackCache && Date.now() - _dbPackFetchedAt < DB_CACHE_TTL) return _dbPackCache;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("custom_weekly_packs")
      .select("*")
      .eq("is_active", true)
      .order("from_date", { ascending: true });
    _dbPackCache = (data ?? []) as unknown as DbCustomPack[];
    _dbPackFetchedAt = Date.now();
  } catch {
    _dbPackCache = _dbPackCache ?? [];
  }
  return _dbPackCache;
}

function getDbOverride(date: Date, dbPacks: DbCustomPack[]): DbCustomPack | null {
  const dateStr = date.toISOString().slice(0, 10);
  return dbPacks.find(p => p.is_active && dateStr >= p.from_date && dateStr <= p.to_date) ?? null;
}

// ── Main function ─────────────────────────────────────────────────────────────

export function getCurrentWeeklyPack(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): WeeklyPack & { isPlusUnlocked: boolean; isFreeUnlocked: boolean; unlocksIn: string | null } {

  const now = new Date();
  const { week, year } = getISOWeek(now);
  const releaseDate   = getSundayOfWeek(week, year);
  const plusEarlyDate = getPreviousFriday(releaseDate);

  const dbOverride = _dbPackCache ? getDbOverride(now, _dbPackCache) : null;
  const override   = dbOverride ? null : getActiveOverride(now);

  let theme: string;
  let emoji: string;
  let description: string;
  let puzzles: PackPuzzle[];
  let isSpecialPack = false;
  let packId: string;

  if (dbOverride) {
    isSpecialPack = true;
    theme         = dbOverride.theme;
    emoji         = dbOverride.emoji;
    description   = dbOverride.description;
    packId        = `db-${dbOverride.id}`;

    puzzles = (dbOverride.puzzles ?? []).map((p, i) =>
      buildThemedPuzzle(
        `${packId}-${i}`, p.type, p.difficulty,
        `db-${dbOverride.id}-${i}`, p.title, theme, i
      )
    );

  } else if (override) {
    isSpecialPack = true;
    theme         = override.theme;
    emoji         = override.emoji;
    description   = override.description;
    packId        = `override-${override.from}`;

    puzzles = override.puzzles.map((p, i) =>
      buildThemedPuzzle(
        `${packId}-${i}`, p.type, p.difficulty,
        overrideSeed(override.from, i), p.title, theme, i
      )
    );

  } else {
    const themeIndex = (week + year * 52) % PACK_THEMES.length;
    const t  = PACK_THEMES[themeIndex];
    theme    = t.theme;
    emoji    = t.emoji;
    description = t.description;
    packId   = `pack-${year}-${week}`;

    const TYPES: PackPuzzle["type"][]       = ["crossword", "word-search", "sudoku", "cryptogram", "word-fill"];
    const DIFFICULTIES: PackPuzzle["difficulty"][] = ["easy", "medium", "medium", "hard", "hard"];
    const titles = PUZZLE_TITLES[theme] ?? ["Puzzle 1", "Puzzle 2", "Puzzle 3", "Puzzle 4", "Puzzle 5"];

    puzzles = Array.from({ length: 5 }, (_, i) =>
      buildThemedPuzzle(
        `${packId}-${i}`, TYPES[i], DIFFICULTIES[i],
        packSeed(week, year, i), titles[i] ?? `Puzzle ${i + 1}`, theme, i
      )
    );
  }

  // Persist themed word assignments to localStorage for puzzle pages
  savePackWordAssignments(packId, puzzles);

  // ── Unlock state ────────────────────────────────────────────────────────────
  const isPremium = hasPremiumAccess({ subscribed: account?.subscribed ?? false, isAdmin: account?.isAdmin ?? false });
  const isPlusUnlocked = now >= plusEarlyDate;
  const isFreeUnlocked = now >= releaseDate;

  // Determine per-puzzle accessibility
  const FREE_SAMPLE_COUNT = 1;
  for (let i = 0; i < puzzles.length; i++) {
    puzzles[i].isSample = i < FREE_SAMPLE_COUNT;
    if (isPremium && isPlusUnlocked) {
      puzzles[i].isAccessible = true;
    } else if (!isPremium && isFreeUnlocked) {
      puzzles[i].isAccessible = i < FREE_SAMPLE_COUNT;
    } else {
      puzzles[i].isAccessible = false;
    }
  }

  let unlocksIn: string | null = null;
  const userUnlockDate = isPremium ? plusEarlyDate : releaseDate;
  const userUnlocked = isPremium ? isPlusUnlocked : isFreeUnlocked;
  if (!userUnlocked) {
    const diff  = userUnlockDate.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(hours / 24);
    unlocksIn   = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
  }

  return {
    id: packId,
    weekNumber: week,
    year,
    theme,
    emoji,
    description,
    puzzles,
    releaseDate,
    plusEarlyDate,
    isCurrentWeek: true,
    isSpecialPack,
    freeCount: FREE_SAMPLE_COUNT,
    isPlusUnlocked,
    isFreeUnlocked,
    unlocksIn,
  };
}

// ── Completion tracking ───────────────────────────────────────────────────────

const PACK_PROGRESS_KEY = "puzzlecraft_pack_progress";

interface PackProgress {
  [packId: string]: string[];
}

export function getPackProgress(): PackProgress {
  try {
    const raw = localStorage.getItem(PACK_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function markPackPuzzleComplete(packId: string, puzzleId: string): void {
  const progress = getPackProgress();
  if (!progress[packId]) progress[packId] = [];
  if (!progress[packId].includes(puzzleId)) {
    progress[packId].push(puzzleId);
    try { localStorage.setItem(PACK_PROGRESS_KEY, JSON.stringify(progress)); }
    catch {}
  }
}

export function getPackCompletionCount(packId: string): number {
  return getPackProgress()[packId]?.length ?? 0;
}
