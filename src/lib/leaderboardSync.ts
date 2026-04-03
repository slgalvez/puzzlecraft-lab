/**
 * Leaderboard sync — pushes the user's current Player Rating
 * to the leaderboard_entries table via a security-definer RPC
 * so users cannot self-inflate ratings.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSolveRecords } from "./solveTracker";
import { computePlayerRating, getSkillTier } from "./solveScoring";

const MIN_SOLVES = 10;

export async function syncLeaderboardRating(userId: string, displayName: string | null) {
  const records = getSolveRecords().filter((r) => r.solveTime >= 10);
  if (records.length < MIN_SOLVES) return;

  const rating = computePlayerRating(records);
  const tier = getSkillTier(rating);

  // Fetch current entry to capture previous rating
  const { data: existing } = await supabase
    .from("leaderboard_entries")
    .select("rating, rating_updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  const previousRating = existing ? existing.rating : 0;

  // Use security-definer RPC to prevent client-side rating manipulation
  await supabase.rpc("upsert_leaderboard_entry" as any, {
    p_user_id: userId,
    p_display_name: displayName || "Anonymous",
    p_rating: rating,
    p_previous_rating: previousRating,
    p_skill_tier: tier,
    p_solve_count: records.length,
  });
}