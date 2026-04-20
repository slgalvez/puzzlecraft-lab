/**
 * shareUtils.ts — Single source of truth for all share text generation
 * and share execution in Puzzlecraft.
 *
 * Three builders:
 *   buildCompletionShareText()  — CompletionPanel (normal, PB, daily, assisted)
 *   buildDailyShareText()       — DailyPuzzle banner share
 *   buildCraftShareText()       — CraftPuzzle send / copy link
 *
 * One executor:
 *   executeShare()              — native share / clipboard fallback
 *
 * All internal helpers return null when data is missing.
 * Builders filter nulls and trim to 280 chars.
 */

import { formatTime } from "@/hooks/usePuzzleTimer";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type Difficulty, type PuzzleCategory } from "@/lib/puzzleTypes";

/* ── Character limit ────────────────────────────────────────────────── */
const CHAR_LIMIT = 280;

/* ── Internal helpers (all return string | null) ────────────────────── */

const TYPE_EMOJI: Record<string, string> = {
  crossword: "📝", "word-fill": "📖", "number-fill": "🔢",
  sudoku: "🧮", "word-search": "🔍", kakuro: "➕",
  nonogram: "🎨", cryptogram: "🔐",
};

const DIFF_EMOJI: Record<string, string> = {
  easy: "🟢", medium: "🟡", hard: "🟠", extreme: "🔴", insane: "🟣",
};

function puzzleIcon(type?: string): string {
  return type ? TYPE_EMOJI[type] ?? "🧩" : "🧩";
}

function puzzleLabel(type?: string): string {
  if (!type) return "Puzzle";
  return (CATEGORY_INFO as Record<string, { name: string }>)[type]?.name ?? "Puzzle";
}

function diffLine(difficulty?: string, time?: number): string | null {
  if (!difficulty || time == null) return null;
  const dot = difficulty ? DIFF_EMOJI[difficulty] ?? "" : "";
  const label = DIFFICULTY_LABELS[difficulty as Difficulty] ?? difficulty;
  return `${dot} ${label} · ⚡ ${formatTime(time)}`;
}

function pbLine(improvement?: number | null, prev?: number | null): string | null {
  if (!improvement || !prev) return null;
  return `🏆 New PB! Beat ${formatTime(prev)} by ${formatTime(improvement)}`;
}

function pbLineShort(): string {
  return "🏆 New PB!";
}

function challengeLine(creatorSolveTime?: number | null): string | null {
  if (!creatorSolveTime || creatorSolveTime <= 0) return null;
  return `I solved it in ${formatTime(creatorSolveTime)} — can you beat me?`;
}

function streakLine(count?: number): string | null {
  if (!count || count < 1) return null;
  const fires = "🔥".repeat(Math.min(count, 7));
  return `${fires} ${count}-day streak`;
}

function rankLine(rank?: number | null, total?: number | null): string | null {
  if (!rank || !total) return null;
  const pct = Math.round((rank / total) * 100);
  const topStr = pct <= 10 ? ` · Top ${pct}% 🎯` : "";
  return `#${rank} of ${total} today${topStr}`;
}

function ctaEnding(url?: string): string | null {
  if (!url) return null;
  return `Can you beat it? → ${url}`;
}

/* ── Trimming to 280 chars ──────────────────────────────────────────── */

/**
 * Lines are in strict order: header, puzzle, PB/challenge, streak, rank, CTA.
 * Indices: 0=header, 1=puzzle, 2=PB/challenge, 3=streak, 4=rank, 5=CTA.
 * Drop order: rank(4) → streak(3) → shorten PB(2).
 * CTA (index 5) is sacred — never dropped.
 */
function trimToLimit(lines: (string | null)[]): string {
  const active = lines.filter((l): l is string => l != null);
  let text = active.join("\n");
  if (text.length <= CHAR_LIMIT) return text;

  // Work on a mutable copy; CTA (index 5) is never a trim candidate
  const work = [...lines];

  // 1. Drop rank (index 4)
  work[4] = null;
  let filtered = work.filter((l): l is string => l != null);
  text = filtered.join("\n");
  if (text.length <= CHAR_LIMIT) return text;

  // 2. Drop streak (index 3)
  work[3] = null;
  filtered = work.filter((l): l is string => l != null);
  text = filtered.join("\n");
  if (text.length <= CHAR_LIMIT) return text;

  // 3. Shorten PB line (index 2) — never remove entirely
  if (work[2] && work[2].startsWith("🏆")) {
    work[2] = pbLineShort();
  }
  filtered = work.filter((l): l is string => l != null);
  text = filtered.join("\n");
  return text;
}

/* ── Exported types ─────────────────────────────────────────────────── */

export interface CompletionShareParams {
  type?: PuzzleCategory;
  difficulty: Difficulty;
  time: number;
  seed?: number;
  isDaily: boolean;
  dailyCode?: string;
  isPB?: boolean;
  prevBest?: number | null;
  improvement?: number | null;
  score?: number | null;
  tier?: string | null;
  rank?: number | null;
  total?: number | null;
  streak?: number;
}

export interface DailyShareParams {
  category?: string;
  typeName?: string;
  difficulty: string;
  time: number;
  streak: number;
  rank?: number | null;
  total?: number | null;
  shareUrl: string;
}

export interface CraftShareParams {
  title?: string;
  from?: string;
  shareUrl?: string;
  puzzleType?: string;
  creatorSolveTime?: number | null;
}

/* ── Builders ───────────────────────────────────────────────────────── */

export function buildCompletionShareText(p: CompletionShareParams): {
  text: string;
  url: string;
  displayCode: string;
} {
  const url = p.dailyCode
    ? `${window.location.origin}/play?code=${p.dailyCode}`
    : `${window.location.origin}/play?code=${p.type ?? "puzzle"}-${p.seed ?? 0}-${p.difficulty}`;
  const displayCode = p.dailyCode ?? String(p.seed ?? "");

  // Line 0: header
  const icon = puzzleIcon(p.type);
  const label = puzzleLabel(p.type);
  let header: string;
  if (p.isPB) {
    header = `🏆 New Personal Best on ${label}!`;
  } else if (p.isDaily) {
    header = `${icon} Solved today's Puzzlecraft daily`;
  } else {
    header = `${icon} Solved a ${label} puzzle`;
  }

  // Strict order: header, puzzle, PB, streak, rank, CTA
  const lines: (string | null)[] = [
    header,
    diffLine(p.difficulty, p.time),
    p.isPB ? pbLine(p.improvement, p.prevBest) : null,
    p.isDaily ? streakLine(p.streak) : null,
    p.isDaily ? rankLine(p.rank, p.total) : null,
    ctaEnding(url),
  ];

  return { text: trimToLimit(lines), url, displayCode };
}

export function buildDailyShareText(p: DailyShareParams): string {
  const typeName = p.typeName ?? (p.category ? puzzleLabel(p.category) : "Puzzle");
  const icon = puzzleIcon(
    p.category ?? Object.entries(CATEGORY_INFO).find(([, v]) => v.name === typeName)?.[0],
  );

  const lines: (string | null)[] = [
    `${icon} Solved today's Puzzlecraft daily`,
    diffLine(p.difficulty, p.time),
    null, // no PB/challenge line for banner
    streakLine(p.streak),
    rankLine(p.rank, p.total),
    ctaEnding(p.shareUrl),
  ];

  return trimToLimit(lines);
}

export function buildCraftShareText(p: CraftShareParams): string {
  const icon = puzzleIcon(p.puzzleType);
  const label = puzzleLabel(p.puzzleType);

  let header: string;
  if (p.title?.trim()) {
    header = `${icon} ${p.title.trim()}`;
  } else if (p.from?.trim()) {
    header = `${icon} ${p.from.trim()} made you a ${label}`;
  } else {
    header = `${icon} Someone made you a ${label}`;
  }

  const lines: (string | null)[] = [
    header,
    null, // no puzzle line for craft
    challengeLine(p.creatorSolveTime),
    null, // no streak
    null, // no rank
    p.shareUrl ? p.shareUrl : null,
  ];

  return trimToLimit(lines);
}

/* ── Share execution ────────────────────────────────────────────────── */

/**
 * Detect a mobile-capable environment for the SMS fallback tier.
 * Uses UA string + UA-CH `userAgentData.mobile` when available.
 */
function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  const uaData = (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData;
  return uaData?.mobile === true;
}

/**
 * Detect macOS desktop (excluding iPadOS 13+, which also reports "Macintosh"
 * but has touch capability). Used to allow Messages.app via `sms:` on Mac.
 */
function isMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const touch = (navigator.maxTouchPoints ?? 0) > 1;
  return /Macintosh/.test(ua) && !touch;
}

/** Any device that can open a Messages app via the `sms:` URL scheme. */
function canOpenMessagesApp(): boolean {
  return isMobile() || isMacDesktop();
}

/**
 * Open the Messages composer via a synthetic anchor click. This is more
 * reliable than `window.location.href = "sms:..."` because Chrome/Firefox/Edge
 * on macOS gate protocol-handler navigations behind a user-gesture-bound
 * anchor click and avoid visibly navigating the page.
 */
function openSmsComposer(body: string): void {
  const a = document.createElement("a");
  a.href = `sms:?&body=${encodeURIComponent(body)}`;
  a.style.position = "fixed";
  a.style.opacity = "0";
  a.style.pointerEvents = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 0);
}

/**
 * 3-tier share cascade:
 *   1. navigator.share — native share sheet (text + url kept separate)
 *   2. sms:?&body=     — opens Messages composer on mobile
 *   3. clipboard       — desktop fallback with combined text\nurl
 *
 * AbortError from Tier 1 is terminal (user canceled) — no fallback fires.
 */
export async function executeShare(
  text: string,
  shareUrl?: string,
): Promise<"shared" | "copied" | "error"> {
  // Combined string used by SMS and clipboard tiers (avoid double-append)
  const fullText =
    shareUrl && !text.includes(shareUrl) ? `${text}\n${shareUrl}` : text;

  // Tier 1: native share sheet — keep text and url separate
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const payload: ShareData = shareUrl ? { text, url: shareUrl } : { text };
      await navigator.share(payload);
      return "shared";
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return "error";
      // Fall through to Tier 2
    }
  }

  // Tier 2: Messages composer on any device with a Messages app
  // (mobile OR macOS desktop). On macOS this opens Messages.app.
  if (canOpenMessagesApp()) {
    try {
      openSmsComposer(fullText);
      // Allow Messages.app / iOS Messages to surface before resolving
      await new Promise((resolve) => setTimeout(resolve, 150));
      return "shared";
    } catch {
      // Fall through to Tier 3
    }
  }

  // Tier 3: clipboard
  try {
    await navigator.clipboard.writeText(fullText);
    return "copied";
  } catch {
    return "error";
  }
}

/* ── Re-exports for convenience ─────────────────────────────────────── */
export { puzzleIcon as getPuzzleTypeEmoji };

export function getDifficultyEmoji(diff?: string): string {
  return diff ? DIFF_EMOJI[diff] ?? "" : "";
}
