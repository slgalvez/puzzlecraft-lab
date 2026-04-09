/**
 * weeklyPacks.ts
 * src/lib/weeklyPacks.ts
 *
 * Only change from the previous version: getCurrentWeeklyPack() now
 * calls getActiveOverride() first. If an override matches today's date,
 * it uses that instead of the auto-generated pack.
 * Everything else is identical.
 */

import { hasPremiumAccess } from "@/lib/premiumAccess";
import { getActiveOverride, type PackOverride } from "@/lib/packOverrides";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PackPuzzle = {
  id: string;
  type: "crossword" | "word-search" | "sudoku" | "cryptogram" | "word-fill";
  difficulty: "easy" | "medium" | "hard";
  seed: string;
  title: string;
};

export type WeeklyPack = {
  id: string;
  weekNumber: number;
  year: number;
  theme: string;
  emoji: string;
  description: string;
  puzzles: PackPuzzle[];
  releaseDate: Date;
  plusEarlyDate: Date;
  isCurrentWeek: boolean;
  /** true if this pack came from a manual override */
  isSpecialPack: boolean;
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

// Puzzle titles per theme — fill in all 12 for production
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
const DB_CACHE_TTL = 5 * 60 * 1000; // 5 min

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

// ── Main function (sync — uses code overrides + cached DB packs) ──────────────

export function getCurrentWeeklyPack(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): WeeklyPack & { isUnlocked: boolean; unlocksIn: string | null } {

  const now = new Date();
  const { week, year } = getISOWeek(now);
  const releaseDate   = getSundayOfWeek(week, year);
  const plusEarlyDate = getPreviousFriday(releaseDate);

  // ── Check for DB custom pack first (if cache is warm) ──────────────────────
  const dbOverride = _dbPackCache ? getDbOverride(now, _dbPackCache) : null;

  // ── Then check for code override ───────────────────────────────────────────
  const override = dbOverride ? null : getActiveOverride(now);

  let theme: string;
  let emoji: string;
  let description: string;
  let puzzles: PackPuzzle[];
  let isSpecialPack = false;
  let packId: string;

  if (dbOverride) {
    isSpecialPack = true;
    theme       = dbOverride.theme;
    emoji       = dbOverride.emoji;
    description = dbOverride.description;
    packId      = `db-${dbOverride.id}`;

    puzzles = (dbOverride.puzzles ?? []).map((p, i) => ({
      id:         `${packId}-${i}`,
      type:       p.type,
      difficulty: p.difficulty,
      seed:       `db-${dbOverride.id}-${i}`,
      title:      p.title,
    }));
  } else if (override) {
    // Use the code override pack
    isSpecialPack = true;
    theme       = override.theme;
    emoji       = override.emoji;
    description = override.description;
    packId      = `override-${override.from}`;

    puzzles = override.puzzles.map((p, i) => ({
      id:         `${packId}-${i}`,
      type:       p.type,
      difficulty: p.difficulty,
      seed:       overrideSeed(override.from, i),
      title:      p.title,
    }));

  } else {
    // Auto-generate from the rotating theme list
    const themeIndex = (week + year * 52) % PACK_THEMES.length;
    const t = PACK_THEMES[themeIndex];
    theme       = t.theme;
    emoji       = t.emoji;
    description = t.description;
    packId      = `pack-${year}-${week}`;

    const TYPES: PackPuzzle["type"][]       = ["crossword", "word-search", "sudoku", "cryptogram", "word-fill"];
    const DIFFICULTIES: PackPuzzle["difficulty"][] = ["easy", "medium", "medium", "hard", "hard"];
    const titles = PUZZLE_TITLES[theme] ?? ["Puzzle 1", "Puzzle 2", "Puzzle 3", "Puzzle 4", "Puzzle 5"];

    puzzles = Array.from({ length: 5 }, (_, i) => ({
      id:         `${packId}-${i}`,
      type:       TYPES[i],
      difficulty: DIFFICULTIES[i],
      seed:       packSeed(week, year, i),
      title:      titles[i] ?? `Puzzle ${i + 1}`,
    }));
  }

  // ── Unlock state ────────────────────────────────────────────────────────────
  const isPremium = hasPremiumAccess({ subscribed: account?.subscribed ?? false, isAdmin: account?.isAdmin ?? false });
  const isUnlocked = isPremium ? now >= plusEarlyDate : now >= releaseDate;

  let unlocksIn: string | null = null;
  if (!isUnlocked) {
    const unlockDate = isPremium ? plusEarlyDate : releaseDate;
    const diff  = unlockDate.getTime() - now.getTime();
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
    isUnlocked,
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
