/**
 * useFriendActivity.ts
 * src/hooks/useFriendActivity.ts
 *
 * Provides fully wired social data for the Social tab:
 *
 *  1. Friend daily streaks — computed from daily_scores per friend
 *  2. Friend daily leaderboard — today's solve times from daily_scores
 *     filtered to the current user's friends
 *  3. Friend activity feed — recent friend solves (daily + craft) merged
 *     and sorted chronologically
 *
 * All queries are gated on having a non-empty friends list.
 * Returns gracefully empty when no friends exist.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";

// ── Types ─────────────────────────────────────────────────────────────────

export interface FriendDailyEntry {
  friendId:    string;
  displayName: string;
  solveTime:   number;  // seconds
  rank:        number;  // rank among friends (1 = fastest)
  isMe:        boolean;
}

export interface FriendActivityItem {
  id:          string;
  type:        "daily_solve" | "craft_solve";
  actorId:     string;
  actorName:   string;
  puzzleType:  string;  // e.g. "crossword", "puzzle"
  solveTime:   number | null;
  timestamp:   Date;
  /** For craft_solve: the shared puzzle ID to navigate to */
  puzzleId?:   string;
  /** For daily_solve: the date string */
  dateStr?:    string;
}

export interface FriendStreakInfo {
  friendId:     string;
  displayName:  string;
  currentStreak: number;
}

// ── Helper: get today's date string ──────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Helper: compute streak from array of date strings ────────────────────

function computeStreak(dateSolvedArr: string[]): number {
  if (!dateSolvedArr || dateSolvedArr.length === 0) return 0;
  const sorted = [...new Set(dateSolvedArr)].sort().reverse();
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Streak must include today or yesterday to be "current"
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

// ── Shared: load friend IDs for the current user ──────────────────────────

async function getFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("friendships" as any)
    .select("user_id_a, user_id_b")
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`) as any;

  if (!data || data.length === 0) return [];
  return (data as any[]).map((f) =>
    f.user_id_a === userId ? f.user_id_b : f.user_id_a
  );
}

// ── Shared: load display names for a list of user IDs ────────────────────

async function getDisplayNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", ids) as any;
  const map: Record<string, string> = {};
  (data ?? []).forEach((p: any) => { map[p.id] = p.display_name ?? "Puzzler"; });
  return map;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useFriendActivity() {
  const { account } = useUserAccount();
  const userId = account?.id;

  // ── 1. Friend daily leaderboard (today) ──────────────────────────────

  const {
    data: dailyLeaderboard = [],
    isLoading: dailyLoading,
  } = useQuery({
    queryKey: ["friend-daily-leaderboard", userId, todayStr()],
    queryFn: async (): Promise<FriendDailyEntry[]> => {
      if (!userId) return [];

      const friendIds = await getFriendIds(userId);
      const allIds = [userId, ...friendIds];

      const today = todayStr();
      const { data: scores } = await supabase
        .from("daily_scores" as any)
        .select("user_id, display_name, solve_time")
        .eq("date_str", today)
        .in("user_id", allIds)
        .order("solve_time", { ascending: true }) as any;

      if (!scores || scores.length === 0) return [];

      const nameMap = await getDisplayNames(allIds);

      return (scores as any[]).map((s, i) => ({
        friendId:    s.user_id,
        displayName: nameMap[s.user_id] ?? s.display_name ?? "Puzzler",
        solveTime:   s.solve_time,
        rank:        i + 1,
        isMe:        s.user_id === userId,
      }));
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // ── 2. Friend streaks ─────────────────────────────────────────────────

  const {
    data: friendStreaks = [],
    isLoading: streaksLoading,
  } = useQuery({
    queryKey: ["friend-streaks", userId],
    queryFn: async (): Promise<FriendStreakInfo[]> => {
      if (!userId) return [];

      const friendIds = await getFriendIds(userId);
      if (friendIds.length === 0) return [];

      const nameMap = await getDisplayNames(friendIds);

      const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
      const { data: scores } = await supabase
        .from("daily_scores" as any)
        .select("user_id, date_str")
        .in("user_id", friendIds)
        .gte("date_str", cutoff)
        .order("date_str", { ascending: false }) as any;

      if (!scores) return [];

      const datesByUser: Record<string, string[]> = {};
      (scores as any[]).forEach((s) => {
        if (!datesByUser[s.user_id]) datesByUser[s.user_id] = [];
        datesByUser[s.user_id].push(s.date_str);
      });

      return friendIds
        .map((fid) => ({
          friendId:      fid,
          displayName:   nameMap[fid] ?? "Puzzler",
          currentStreak: computeStreak(datesByUser[fid] ?? []),
        }))
        .filter((f) => f.currentStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak);
    },
    enabled: !!userId,
    staleTime: 300_000,
  });

  // ── 3. Friend activity feed (merged daily + craft, last 48h) ─────────

  const {
    data: activityFeed = [],
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["friend-activity-feed", userId],
    queryFn: async (): Promise<FriendActivityItem[]> => {
      if (!userId) return [];

      const friendIds = await getFriendIds(userId);
      if (friendIds.length === 0) return [];

      const nameMap = await getDisplayNames(friendIds);
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const items: FriendActivityItem[] = [];

      // A. Friend daily solves (last 48h)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      const { data: dailyScores } = await supabase
        .from("daily_scores" as any)
        .select("id, user_id, display_name, solve_time, puzzle_type, date_str, created_at")
        .in("user_id", friendIds)
        .gte("date_str", twoDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20) as any;

      (dailyScores ?? []).forEach((s: any) => {
        items.push({
          id:         `daily-${s.id}`,
          type:       "daily_solve",
          actorId:    s.user_id,
          actorName:  nameMap[s.user_id] ?? s.display_name ?? "Puzzler",
          puzzleType: s.puzzle_type ?? "puzzle",
          solveTime:  s.solve_time,
          timestamp:  new Date(s.created_at ?? Date.now()),
          dateStr:    s.date_str,
        });
      });

      // B. Friends who solved craft puzzles recently
      const { data: craftSolves } = await supabase
        .from("craft_recipients" as any)
        .select("id, puzzle_id, display_name, solve_time, completed_at")
        .not("completed_at", "is", null)
        .gte("completed_at", cutoff)
        .order("completed_at", { ascending: false })
        .limit(10) as any;

      (craftSolves ?? []).forEach((s: any) => {
        items.push({
          id:         `craft-${s.id}`,
          type:       "craft_solve",
          actorId:    "anon",
          actorName:  s.display_name ?? "Someone",
          puzzleType: "puzzle",
          solveTime:  s.solve_time,
          timestamp:  new Date(s.completed_at),
          puzzleId:   s.puzzle_id,
        });
      });

      // Merge, sort
      return items
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    },
    enabled: !!userId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const loading = dailyLoading || streaksLoading || activityLoading;

  return {
    dailyLeaderboard,
    friendStreaks,
    activityFeed,
    loading,
    refetchActivity,
    hasFriendActivity: activityFeed.length > 0,
    hasDailyLeaderboard: dailyLeaderboard.length > 1,
  };
}
