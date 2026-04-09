/**
 * useFriends.ts - React hook wrapping all friend operations.
 * Exports FriendWithStats, PendingRequest types for UI consumption.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";

// ── Exported types ────────────────────────────────────────────────────────

export interface FriendWithStats {
  id: string;
  displayName: string;
  friendCode: string | null;
  rating: number | null;
  skillTier: string | null;
  solveCount: number | null;
  isPremium: boolean;
}

export interface PendingRequest {
  requestId: string;
  sender: {
    id: string;
    displayName: string;
    friendCode: string | null;
  };
  createdAt: string;
}

export interface SearchResult {
  id: string;
  displayName: string;
  friendCode: string | null;
  isPremium: boolean;
}

// ── Query keys ────────────────────────────────────────────────────────────

export const FRIEND_KEYS = {
  friends:     (uid: string) => ["friends", uid],
  pending:     (uid: string) => ["friend-pending", uid],
  friendCode:  (uid: string) => ["friend-code", uid],
};

// ── Data fetchers ─────────────────────────────────────────────────────────

async function fetchFriends(userId: string): Promise<FriendWithStats[]> {
  const { data: ships } = await supabase
    .from("friendships" as any)
    .select("user_id_a, user_id_b, created_at")
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`) as any;

  if (!ships || ships.length === 0) return [];

  const friendIds = (ships as any[]).map((f: any) =>
    f.user_id_a === userId ? f.user_id_b : f.user_id_a
  );

  // Get profiles
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, friend_code, is_premium")
    .in("id", friendIds);

  // Get leaderboard entries for ratings
  const { data: lbEntries } = await supabase
    .from("leaderboard_entries")
    .select("user_id, rating, skill_tier, solve_count")
    .in("user_id", friendIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const lbMap = new Map((lbEntries ?? []).map((e: any) => [e.user_id, e]));

  return friendIds.map((fid: string) => {
    const profile = profileMap.get(fid);
    const lb = lbMap.get(fid);
    return {
      id: fid,
      displayName: profile?.display_name ?? "Puzzler",
      friendCode: profile?.friend_code ?? null,
      isPremium: profile?.is_premium ?? false,
      rating: lb?.rating ?? null,
      skillTier: lb?.skill_tier ?? null,
      solveCount: lb?.solve_count ?? null,
    };
  });
}

async function fetchPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data } = await supabase
    .from("friend_requests" as any)
    .select("id, sender_id, receiver_id, status, created_at")
    .eq("status", "pending")
    .eq("receiver_id", userId) as any;

  if (!data || data.length === 0) return [];

  const senderIds = (data as any[]).map((r: any) => r.sender_id);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, friend_code")
    .in("id", senderIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return (data as any[]).map((r: any) => {
    const p = profileMap.get(r.sender_id);
    return {
      requestId: r.id,
      sender: {
        id: r.sender_id,
        displayName: p?.display_name ?? "User",
        friendCode: p?.friend_code ?? null,
      },
      createdAt: r.created_at,
    };
  });
}

async function fetchMyFriendCode(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("friend_code")
    .eq("id", userId)
    .single();
  return (data as any)?.friend_code ?? null;
}

// ── Main hook ─────────────────────────────────────────────────────────────

export function useFriends() {
  const { account } = useUserAccount();
  const userId = account?.id ?? null;
  const qc = useQueryClient();

  // ── Core queries ──

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: FRIEND_KEYS.friends(userId ?? ""),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({
    queryKey: FRIEND_KEYS.pending(userId ?? ""),
    queryFn: () => fetchPendingRequests(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { data: myFriendCode } = useQuery({
    queryKey: FRIEND_KEYS.friendCode(userId ?? ""),
    queryFn: () => fetchMyFriendCode(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const receivedCount = pendingRequests.length;

  // ── Invalidation ──

  const invalidateAll = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.friends(userId) });
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.pending(userId) });
  }, [userId, qc]);

  // ── Mutations ──

  const sendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      const { error } = await supabase
        .from("friend_requests" as any)
        .insert({ sender_id: userId!, receiver_id: receiverId } as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("friend_requests" as any)
        .update({ status: "accepted", updated_at: new Date().toISOString() } as any)
        .eq("id", requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const declineRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("friend_requests" as any)
        .update({ status: "declined", updated_at: new Date().toISOString() } as any)
        .eq("id", requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const removeFriend = useMutation({
    mutationFn: async (friendId: string) => {
      // Delete from friendships table — need canonical ordering
      const a = userId! < friendId ? userId! : friendId;
      const b = userId! < friendId ? friendId : userId!;
      const { error } = await supabase
        .from("friendships" as any)
        .delete()
        .eq("user_id_a", a)
        .eq("user_id_b", b);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  // ── Search ──

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!userId || q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, display_name, friend_code, is_premium")
        .or(`friend_code.eq.${q.toUpperCase()},display_name.ilike.%${q}%`)
        .neq("id", userId)
        .limit(20);

      setSearchResults((data ?? []).map((u: any) => ({
        id: u.id,
        displayName: u.display_name ?? "User",
        friendCode: u.friend_code,
        isPremium: u.is_premium ?? false,
      })));
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearchLoading(false);
    }
  }, [userId]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  // ── Relationship check ──

  const getRelationship = useCallback(async (otherId: string): Promise<string> => {
    if (!userId) return "none";

    // Check friendships
    const isFriend = friends.some((f) => f.id === otherId);
    if (isFriend) return "friends";

    // Check pending requests
    const { data } = await supabase
      .from("friend_requests" as any)
      .select("sender_id, status")
      .eq("status", "pending")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`) as any;

    if (data && data.length > 0) {
      return (data as any[])[0].sender_id === userId ? "sent" : "received";
    }
    return "none";
  }, [userId, friends]);

  return {
    friends,
    friendsLoading,
    pendingRequests,
    pendingLoading,
    myFriendCode,
    receivedCount,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    search,
    searchResults,
    searchLoading,
    searchError,
    clearSearch,
    getRelationship,
    invalidateAll,
    userId,
    isLoggedIn: !!userId,
  };
}
