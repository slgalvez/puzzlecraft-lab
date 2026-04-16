/**
 * shareText.ts — Thin compatibility wrapper around shareUtils.ts.
 *
 * All formatting logic lives in shareUtils.ts.
 * This file maps legacy signatures to the unified builders.
 */

import {
  buildCompletionShareText,
  buildDailyShareText as buildDailyShareTextCore,
  buildCraftShareText as buildCraftShareTextCore,
  executeShare,
  getPuzzleTypeEmoji,
  getDifficultyEmoji,
  type CompletionShareParams,
} from "@/lib/shareUtils";

export { getPuzzleTypeEmoji, getDifficultyEmoji };

/* ── Solve share (CompletionPanel) ──────────────────────────────────── */

export type SolveShareData = CompletionShareParams;

export function buildSolveShareText(data: SolveShareData): {
  text: string;
  url: string;
  displayCode: string;
} {
  return buildCompletionShareText(data);
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
  return buildDailyShareTextCore({
    typeName: data.typeName,
    difficulty: data.difficulty,
    time: data.time,
    streak: data.streak,
    rank: data.rank,
    total: data.total,
    shareUrl: data.shareUrl,
  });
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
  return buildCraftShareTextCore({
    title: data.title,
    from: data.from,
    shareUrl: data.url,
    puzzleType: data.type,
    creatorSolveTime: data.creatorSolveTime,
  });
}

/* ── Share-or-copy helper (legacy) ────────────────────────────────── */

export async function shareOrCopy(
  text: string,
  toast: (opts: { title: string }) => void,
): Promise<boolean> {
  const result = await executeShare(text);
  if (result === "copied") {
    toast({ title: "Copied to clipboard" });
    return true;
  }
  return result === "shared";
}
