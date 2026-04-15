/**
 * useRatingSync.ts
 * src/hooks/useRatingSync.ts
 *
 * Syncs the player's computed rating to Supabase after every solve.
 * Also restores rating from Supabase on first load if localStorage is empty
 * (e.g. fresh install, new device).
 *
 * Usage — call this once inside PublicRoutes or UserAccountProvider:
 *   useRatingSync();
 *
 * After a solve, call the returned syncNow() to push immediately:
 *   const { syncNow } = useRatingSync();
 *   syncNow();
 */

import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier } from "@/lib/solveScoring";

const RATING_CACHE_KEY  = "puzzlecraft_rating";
const RATING_SYNCED_KEY = "puzzlecraft_rating_synced_at";
const MIN_SOLVES_FOR_RATING = 5;

// ── Compute current local rating ──────────────────────────────────────────

function computeCurrentRating(): { rating: number; tier: string; solvesCount: number } | null {
  try {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (records.length < MIN_SOLVES_FOR_RATING) return null;
    const rating = computePlayerRating(records);
    const tier = getSkillTier(rating, records.length);
    return { rating, tier, solvesCount: records.length };
  } catch {
    return null;
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────

export function useRatingSync() {
  const syncInFlight = useRef(false);

  const syncNow = useCallback(async () => {
    if (syncInFlight.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const computed = computeCurrentRating();
    if (!computed) return;

    syncInFlight.current = true;
    try {
      const { error } = await (supabase
        .from("user_profiles") as any)
        .upsert(
          {
            id:           user.id,
            rating:       computed.rating,
            rating_tier:  computed.tier,
            solves_count: computed.solvesCount,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (!error) {
        try {
          localStorage.setItem(RATING_CACHE_KEY, JSON.stringify(computed));
          localStorage.setItem(RATING_SYNCED_KEY, new Date().toISOString());
        } catch {}
      }
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  // On mount: if local storage has no rating but user is signed in,
  // pull from Supabase to restore after reinstall
  useEffect(() => {
    const restore = async () => {
      const localRating = localStorage.getItem(RATING_CACHE_KEY);
      if (localRating) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase
        .from("user_profiles") as any)
        .select("rating, rating_tier, solves_count")
        .eq("id", user.id)
        .single();

      if (data && data.rating) {
        try {
          localStorage.setItem(RATING_CACHE_KEY, JSON.stringify({
            rating: data.rating,
            tier: data.rating_tier,
            solvesCount: data.solves_count,
          }));
        } catch {}
      }
    };

    restore();
  }, []);

  // Sync once on mount (catches any solves that happened offline)
  useEffect(() => {
    const lastSync = localStorage.getItem(RATING_SYNCED_KEY);
    const needsSync = !lastSync ||
      Date.now() - new Date(lastSync).getTime() > 5 * 60 * 1000;

    if (needsSync) {
      syncNow();
    }
  }, [syncNow]);

  return { syncNow };
}
