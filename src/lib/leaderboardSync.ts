/**
 * leaderboardSync.ts
 * src/lib/leaderboardSync.ts
 *
 * Pushes user's Player Rating to leaderboard_entries via security-definer RPC.
 * Uses shared LEADERBOARD_THRESHOLD and getPlayerRatingInfo() from solveScoring.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSolveRecords } from "./solveTracker";
import { getPlayerRatingInfo, LEADERBOARD_THRESHOLD } from "./solveScoring";

export async function syncLeaderboardRating(userId: string, displayName: string | null) {
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);

  // Don't push provisional users — LEADERBOARD_THRESHOLD is 10
  if (records.length < LEADERBOARD_THRESHOLD) return;

  const info = getPlayerRatingInfo(records);
  if (info.hasNoData) return;

  // Fetch current entry to capture previous rating
  const { data: existing } = await supabase
    .from("leaderboard_entries")
    .select("rating, rating_updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const previousRating = existing ? existing.rating : 0;

  await supabase.rpc("upsert_leaderboard_entry" as any, {
    p_user_id:        userId,
    p_display_name:   displayName || "Anonymous",
    p_rating:         info.rating,
    p_previous_rating: previousRating,
    p_skill_tier:     info.tier,
    p_solve_count:    info.solveCount,
  });
}