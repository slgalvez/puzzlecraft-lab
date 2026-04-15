/**
 * leaderboardSync.ts
 * src/lib/leaderboardSync.ts
 *
 * Pushes user's Player Rating to leaderboard_entries via security-definer RPC.
 * Also syncs per-puzzle-type ratings to type_leaderboard_entries.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSolveRecords } from "./solveTracker";
import {
  computePlayerRating,
  computeTypeRating,
  getSkillTier,
  LEADERBOARD_MIN_SOLVES,
  TYPE_LEADERBOARD_MIN_SOLVES,
} from "./solveScoring";
import type { PuzzleCategory } from "./puzzleTypes";

const ALL_PUZZLE_TYPES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

// ── Global leaderboard sync ────────────────────────────────────────────────

export async function syncLeaderboardRating(userId: string, displayName: string | null) {
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  if (records.length < LEADERBOARD_MIN_SOLVES) return;

  const rating = computePlayerRating(records);
  const tier   = getSkillTier(rating, records.length);

  const { data: existing } = await supabase
    .from("leaderboard_entries")
    .select("rating")
    .eq("user_id", userId)
    .maybeSingle();

  const previousRating = existing?.rating ?? 0;

  await supabase.rpc("upsert_leaderboard_entry" as any, {
    p_user_id:        userId,
    p_display_name:   displayName || "Anonymous",
    p_rating:         rating,
    p_previous_rating: previousRating,
    p_skill_tier:     tier,
    p_solve_count:    records.length,
  });

  // Sync per-type ratings in parallel (fire-and-forget — don't block)
  syncTypeLeaderboards(userId, displayName).catch(() => {});
}

// ── Per-type leaderboard sync ──────────────────────────────────────────────

export async function syncTypeLeaderboards(userId: string, displayName: string | null) {
  const allRecords = getSolveRecords().filter((r) => r.solveTime >= 10);

  const syncs = ALL_PUZZLE_TYPES.map(async (puzzleType) => {
    const typeRecords = allRecords.filter((r) => r.puzzleType === puzzleType);
    if (typeRecords.length < TYPE_LEADERBOARD_MIN_SOLVES) return;

    const rating = computeTypeRating(allRecords, puzzleType);
    const tier   = getSkillTier(rating, typeRecords.length);

    const { data: existing } = await (supabase as any)
      .from("type_leaderboard_entries")
      .select("rating")
      .eq("user_id", userId)
      .eq("puzzle_type", puzzleType)
      .maybeSingle();

    const previousRating = (existing as any)?.rating ?? 0;

    await supabase.rpc("upsert_type_leaderboard_entry" as any, {
      p_user_id:         userId,
      p_puzzle_type:     puzzleType,
      p_display_name:    displayName || "Anonymous",
      p_rating:          rating,
      p_previous_rating: previousRating,
      p_skill_tier:      tier,
      p_solve_count:     typeRecords.length,
    });
  });

  await Promise.allSettled(syncs);
}
