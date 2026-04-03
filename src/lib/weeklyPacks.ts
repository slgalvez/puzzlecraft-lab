/**
 * weeklyPacks.ts
 * Weekly curated puzzle packs that drop every Sunday.
 * Plus subscribers get early access on Friday.
 * Packs are seeded by week number — deterministic for all users.
 */

import { hasPremiumAccess } from "@/lib/premiumAccess";

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
};

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
  "Around the World":  ["Capital Cities", "Famous Landmarks", "World Cuisines", "Languages of Earth", "Mountain Ranges"],
  "Silver Screen":     ["Best Picture Winners", "Iconic Directors", "Legendary Actors", "Film Genres", "Classic Quotes"],
  "The Natural World": ["Endangered Species", "Ocean Deep", "The Rainforest", "Bird Life", "Geology"],
  "Into the Kitchen":  ["Spice Rack", "Baking Basics", "Italian Favourites", "Street Food", "Chef's Tools"],
  "Great Minds":       ["Physics Pioneers", "Medical Breakthroughs", "Space Explorers", "Inventors", "Nobel Winners"],
  "Game On":           ["Classic Arcade", "Strategy Games", "RPG Heroes", "Speedrun Records", "Gaming Legends"],
  "Music to My Ears":  ["Rock Anthems", "Classical Masters", "Jazz Greats", "Pop Icons", "Musical Instruments"],
  "By the Book":       ["Classic Novels", "Poetry Masters", "Fantasy Worlds", "Mystery Authors", "First Lines"],
  "Sports Legends":    ["Olympic Gold", "Football Heroes", "Tennis Greats", "Marathon Records", "Team Dynasties"],
  "Into Space":        ["Planet Facts", "Moon Missions", "Star Types", "Space Agencies", "Cosmic Scale"],
  "Ancient History":   ["Egyptian Pharaohs", "Roman Empire", "Greek Mythology", "Medieval Times", "Lost Cities"],
  "Pop Culture Remix": ["Viral Moments", "Iconic Brands", "Meme Origins", "Trend Setters", "Internet Firsts"],
};

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

export function getCurrentWeeklyPack(
  account: { subscribed?: boolean; isAdmin?: boolean } | null
): WeeklyPack & { isUnlocked: boolean; unlocksIn: string | null } {
  const now = new Date();
  const { week, year } = getISOWeek(now);
  const themeIndex = (week + year * 52) % PACK_THEMES.length;
  const { theme, emoji, description } = PACK_THEMES[themeIndex];
  const titles = PUZZLE_TITLES[theme] ?? ["Puzzle 1", "Puzzle 2", "Puzzle 3", "Puzzle 4", "Puzzle 5"];

  const packId = `pack-${year}-${week}`;
  const releaseDate = getSundayOfWeek(week, year);
  const plusEarlyDate = getPreviousFriday(releaseDate);

  const TYPES: PackPuzzle["type"][] = ["crossword", "word-search", "sudoku", "cryptogram", "word-fill"];
  const DIFFICULTIES: PackPuzzle["difficulty"][] = ["easy", "medium", "medium", "hard", "hard"];

  const puzzles: PackPuzzle[] = Array.from({ length: 5 }, (_, i) => ({
    id: `${packId}-${i}`,
    type: TYPES[i],
    difficulty: DIFFICULTIES[i],
    seed: packSeed(week, year, i),
    title: titles[i] ?? `Puzzle ${i + 1}`,
  }));

  const isPremium = hasPremiumAccess(account);
  const isUnlocked = isPremium ? now >= plusEarlyDate : now >= releaseDate;

  let unlocksIn: string | null = null;
  if (!isUnlocked) {
    const unlockDate = isPremium ? plusEarlyDate : releaseDate;
    const diff = unlockDate.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    unlocksIn = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;
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

export function getPackCompletionCount(packId: string, _totalPuzzles: number): number {
  const progress = getPackProgress();
  return progress[packId]?.length ?? 0;
}
