/**
 * Leaderboard sync — pushes the user's current Player Rating
 * to the leaderboard_entries table so it's visible to all users.
 * Tracks previous rating for change indicators.
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

  // Only update previous_rating if the stored rating differs
  const previousRating = existing ? existing.rating : 0;

  await supabase.from("leaderboard_entries").upsert(
    {
      user_id: userId,
      display_name: displayName || "Anonymous",
      rating,
      previous_rating: previousRating,
      skill_tier: tier,
      solve_count: records.length,
      updated_at: new Date().toISOString(),
      rating_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
