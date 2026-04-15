/**
 * shareText.ts — Single source of truth for all share copy in Puzzlecraft.
 *
 * Three builders:
 *   buildSolveShareText()  — CompletionPanel (normal, PB, daily, assisted)
 *   buildDailyShareText()  — DailyPuzzle banner share
 *   buildCraftShareText()  — CraftPuzzle send / copy link
 *
 * Plus helpers: getPuzzleTypeEmoji, getDifficultyEmoji, shareOrCopy
 */

import { formatTime } from "@/hooks/usePuzzleTimer";
import type { PuzzleCategory, Difficulty } from "@/lib/puzzleTypes";
import { CATEGORY_INFO, DIFFICULTY_LABELS } from "@/lib/puzzleTypes";

/* ── Emoji helpers ─────────────────────────────────────────────────────── */

const TYPE_EMOJI: Record<string, string> = {
  crossword: "📝",
  "word-fill": "📖",
  "number-fill": "🔢",
  sudoku: "🧮",
  "word-search": "🔍",
  kakuro: "➕",
  nonogram: "🎨",
  cryptogram: "🔐",
};

const DIFF_EMOJI: Record<string, string> = {
  easy: "🟢",
  medium: "🟡",
  hard: "🟠",
  extreme: "🔴",
  insane: "🟣",
};

export function getPuzzleTypeEmoji(type?: string): string {
  return type ? TYPE_EMOJI[type] ?? "🧩" : "🧩";
}

export function getDifficultyEmoji(diff?: string): string {
  return diff ? DIFF_EMOJI[diff] ?? "" : "";
}

/* ── Solve share (CompletionPanel) ──────────────────────────────────── */

export interface SolveShareData {
  type?: PuzzleCategory;
  difficulty: Difficulty;
  time: number;
  seed?: number;
  isDaily: boolean;
  dailyCode?: string;
  /** Personal best state */
  isPB?: boolean;
  prevBest?: number | null;
  improvement?: number | null;
  /** Rating info */
  score?: number | null;
  tier?: string | null;
  /** Daily rank */
  rank?: number | null;
  total?: number | null;
  /** Streak */
  streak?: number;
}

export function buildSolveShareText(data: SolveShareData): {
  text: string;
  url: string;
  displayCode: string;
} {
  const {
    type,
    difficulty,
    time,
    seed,
    isDaily,
    dailyCode,
    isPB,
    prevBest,
    improvement,
    score,
    tier,
    rank,
    total,
    streak,
  } = data;

  const typeName = type ? CATEGORY_INFO[type]?.name ?? type : "Puzzle";
  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const timeStr = formatTime(time);
  const emoji = getPuzzleTypeEmoji(type);
  const diffDot = getDifficultyEmoji(difficulty);

  const url = dailyCode
    ? `${window.location.origin}/play?code=${dailyCode}`
    : `${window.location.origin}/play?code=${type ?? "puzzle"}-${seed ?? 0}-${difficulty}`;
  const displayCode = dailyCode ?? String(seed ?? "");

  // Headline
  let headline: string;
  if (isPB) {
    headline = `🏆 New Personal Best on ${typeName}!`;
  } else if (isDaily) {
    headline = `${emoji} Solved today's Puzzlecraft daily`;
  } else {
    headline = `${emoji} Solved a ${typeName} puzzle`;
  }

  // Core line
  const lines: string[] = [headline, ""];
  lines.push(`${diffDot} ${diffLabel} · ${timeStr}`);

  // PB improvement
  if (isPB && improvement && prevBest) {
    lines.push(`↓${formatTime(improvement)} from ${formatTime(prevBest)}`);
  }

  // Score + tier
  if (score && tier) {
    lines.push(`⭐ ${score.toLocaleString()} pts · ${tier}`);
  }

  // Daily rank
  if (isDaily && rank && total) {
    lines.push(`📊 #${rank} of ${total} player${total !== 1 ? "s" : ""}`);
  }

  // Streak (shown when >= 1)
  if (isDaily && streak && streak >= 1) {
    lines.push(`🔥 ${streak}-day streak`);
  }

  lines.push("");
  lines.push(`Can you beat this time?`);
  lines.push(url);

  return { text: lines.join("\n"), url, displayCode };
}

/* ── Daily banner share ────────────────────────────────────────────── */

export interface DailyShareData {
  typeName: string;
  difficulty: string;
  time: number;
  streak: number;
  rank?: number | null;
  total?: number | null;
  shareUrl: string;
}

export function buildDailyShareText(data: DailyShareData): string {
  const { typeName, difficulty, time, streak, rank, total, shareUrl } = data;
  const timeStr = formatTime(time);
  const diffLabel = DIFFICULTY_LABELS[difficulty as Difficulty] ?? difficulty;
  const emoji = getPuzzleTypeEmoji(
    Object.entries(CATEGORY_INFO).find(([, v]) => v.name === typeName)?.[0],
  );

  const lines: string[] = [];
  lines.push(`${emoji} Solved today's Puzzlecraft daily`);
  lines.push("");
  lines.push(`${typeName} · ${diffLabel} · ${timeStr}`);

  if (rank && total) {
    lines.push(`📊 #${rank} of ${total}`);
  }

  if (streak >= 1) {
    lines.push(`🔥 ${streak}-day streak`);
  }

  lines.push("");
  lines.push("Can you beat this time?");
  lines.push(shareUrl);

  return lines.join("\n");
}

/* ── Craft share ───────────────────────────────────────────────────── */

export interface CraftShareData {
  title?: string;
  from?: string;
  url?: string;
  type?: string;
  creatorSolveTime?: number | null;
}

export function buildCraftShareText(data: CraftShareData): string {
  const { title, from, url, type, creatorSolveTime } = data;

  const TYPE_LABELS: Record<string, string> = {
    "word-search": "Word Search",
    "word-fill": "Word Fill-In",
    crossword: "Crossword",
    cryptogram: "Cryptogram",
  };

  const emoji = getPuzzleTypeEmoji(type);
  const label = type ? TYPE_LABELS[type] ?? "Puzzle" : "Puzzle";

  let headline: string;
  if (title?.trim()) {
    headline = `${emoji} ${title.trim()}`;
  } else if (from?.trim()) {
    headline = `${emoji} ${from.trim()} made you a ${label}`;
  } else {
    headline = `${emoji} Someone made you a ${label}`;
  }

  let challengeLine = "";
  if (creatorSolveTime && creatorSolveTime > 0) {
    const mins = Math.floor(creatorSolveTime / 60);
    const secs = creatorSolveTime % 60;
    const timeStr =
      mins > 0
        ? `${mins}:${secs.toString().padStart(2, "0")}`
        : `${secs}s`;
    challengeLine = `\nI solved it in ${timeStr} — can you beat me?`;
  }

  const urlLine = url ? `\n${url}` : "";

  return `${headline}${challengeLine}${urlLine}`;
}

/* ── Share-or-copy helper ─────────────────────────────────────────── */

export async function shareOrCopy(
  text: string,
  toast: (opts: { title: string }) => void,
): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return false;
      // Fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
    return true;
  } catch {
    return false;
  }
}
