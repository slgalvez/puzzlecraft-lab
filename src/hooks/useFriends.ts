/**
 * useFriends.ts - React hook wrapping all friend operations with loading/optimistic states.
 */
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserAccount } from "@/contexts/UserAccountContext";
import {
  getFriends, getPendingRequests, getMyFriendCode,
  searchUsers, getUserByFriendCode,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest,
  cancelFriendRequest, removeFriend,
  getFriendLeaderboard, getFriendActivity, getFriendStatus,
  type Friend, type PendingRequest, type PublicProfile,
} from "@/lib/friendsService";

export const FRIEND_KEYS = {
  friends:     (uid: string) => ["friends", uid],
  pending:     (uid: string) => ["friend-pending", uid],
  friendCode:  (uid: string) => ["friend-code", uid],
  leaderboard: (uid: string) => ["friend-leaderboard", uid],
  activity:    (uid: string) => ["friend-activity", uid],
  status:      (uid: string, other: string) => ["friend-status", uid, other],
};

export function useFriends() {
  const { account } = useUserAccount();
  const userId = account?.id ?? null;
  const qc = useQueryClient();

  const { data: friends = [], isLoading: friendsLoading, refetch: refetchFriends } = useQuery({
    queryKey: FRIEND_KEYS.friends(userId ?? ""),
    queryFn: () => getFriends(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: pending = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: FRIEND_KEYS.pending(userId ?? ""),
    queryFn: () => getPendingRequests(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { data: myFriendCode } = useQuery({
    queryKey: FRIEND_KEYS.friendCode(userId ?? ""),
    queryFn: () => getMyFriendCode(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const { data: friendLeaderboard = [] } = useQuery({
    queryKey: FRIEND_KEYS.leaderboard(userId ?? ""),
    queryFn: () => getFriendLeaderboard(userId!),
    enabled: !!userId && friends.length > 0,
    staleTime: 120_000,
  });

  const { data: friendActivity = [] } = useQuery({
    queryKey: FRIEND_KEYS.activity(userId ?? ""),
    queryFn: () => getFriendActivity(userId!),
    enabled: !!userId && friends.length > 0,
    staleTime: 120_000,
  });

  const receivedCount = pending.filter((p) => p.direction === "received").length;
  const friendCount = friends.length;

  const invalidateAll = useCallback(() => {
    if (!userId) return;
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.friends(userId) });
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.pending(userId) });
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.leaderboard(userId) });
    qc.invalidateQueries({ queryKey: FRIEND_KEYS.activity(userId) });
  }, [userId, qc]);

  const sendReq    = useMutation({ mutationFn: (id: string) => sendFriendRequest(userId!, id),   onSuccess: invalidateAll });
  const acceptReq  = useMutation({ mutationFn: (id: string) => acceptFriendRequest(id),          onSuccess: invalidateAll });
  const declineReq = useMutation({ mutationFn: (id: string) => declineFriendRequest(id),         onSuccess: invalidateAll });
  const cancelReq  = useMutation({ mutationFn: (id: string) => cancelFriendRequest(id),          onSuccess: invalidateAll });
  const removeReq  = useMutation({ mutationFn: (id: string) => removeFriend(id),                 onSuccess: invalidateAll });

  return {
    friends, pending, myFriendCode, friendLeaderboard, friendActivity,
    friendCount, receivedCount, friendsLoading, pendingLoading,
    sendRequest:    (id: string) => sendReq.mutateAsync(id),
    acceptRequest:  (id: string) => acceptReq.mutateAsync(id),
    declineRequest: (id: string) => declineReq.mutateAsync(id),
    cancelRequest:  (id: string) => cancelReq.mutateAsync(id),
    removeFriend:   (id: string) => removeReq.mutateAsync(id),
    isSending: sendReq.isPending, isAccepting: acceptReq.isPending,
    isDeclining: declineReq.isPending, isRemoving: removeReq.isPending,
    refetchFriends, refetchPending, invalidateAll,
    userId, isLoggedIn: !!userId,
  };
}

export function useFriendStatus(otherUserId: string | null) {
  const { account } = useUserAccount();
  const userId = account?.id ?? null;
  return useQuery({
    queryKey: FRIEND_KEYS.status(userId ?? "", otherUserId ?? ""),
    queryFn: () => getFriendStatus(userId!, otherUserId!),
    enabled: !!userId && !!otherUserId && userId !== otherUserId,
    staleTime: 30_000,
  });
}

export function useFriendSearch() {
  const { account } = useUserAccount();
  const userId = account?.id ?? null;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    setSearchError(null);
    if (!userId || q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchUsers(q, userId)); }
    catch { setSearchError("Search failed. Try again."); }
    finally { setSearching(false); }
  }, [userId]);

  const lookupByCode = useCallback(async (code: string) => {
    if (!code.trim()) return null;
    setSearching(true);
    try {
      const res = await getUserByFriendCode(code);
      if (res) setResults([res]);
      else { setResults([]); setSearchError("No user found with that code."); }
      return res;
    } catch { setSearchError("Lookup failed."); return null; }
    finally { setSearching(false); }
  }, []);

  const clear = useCallback(() => { setQuery(""); setResults([]); setSearchError(null); }, []);

  return { query, results, searching, searchError, search, lookupByCode, clear };
}
