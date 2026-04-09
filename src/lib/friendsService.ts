/**
 * friendsService.ts — Database layer for the friends system.
 * All Supabase queries for friend codes, requests, friendships, leaderboard, and activity.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PublicProfile {
  id: string;
  displayName: string;
  friendCode: string | null;
  isPremium: boolean;
  avatarInitial: string;
}

export interface Friend {
  friendshipId: string; // canonical key for removal
  userId: string;
  displayName: string;
  friendCode: string | null;
  isPremium: boolean;
  avatarInitial: string;
  friendsSince: string;
}

export interface PendingRequest {
  friendshipId: string; // friend_requests.id
  userId: string;       // the other user
  displayName: string;
  avatarInitial: string;
  direction: "sent" | "received";
  requestedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarInitial: string;
  rating: number;
  tier: string;
  solveCount: number;
}

export interface ActivityEntry {
  userId: string;
  displayName: string;
  avatarInitial: string;
  puzzleType: string;
  solveTime: number;
  dateStr: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function initial(name: string | null): string {
  return (name ?? "?").charAt(0).toUpperCase();
}

// ── Friend code ───────────────────────────────────────────────────────────

export async function getMyFriendCode(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("friend_code")
    .eq("id", userId)
    .single();
  return (data as any)?.friend_code ?? null;
}

// ── Search users ──────────────────────────────────────────────────────────

export async function searchUsers(query: string, myUserId: string): Promise<PublicProfile[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Search by friend code (exact) or display_name (partial)
  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name, friend_code, is_premium")
    .or(`friend_code.eq.${q.toUpperCase()},display_name.ilike.%${q}%`)
    .neq("id", myUserId)
    .limit(20);

  return (data ?? []).map((u: any) => ({
    id: u.id,
    displayName: u.display_name ?? "User",
    friendCode: u.friend_code,
    isPremium: u.is_premium ?? false,
    avatarInitial: initial(u.display_name),
  }));
}

export async function getUserByFriendCode(code: string): Promise<PublicProfile | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name, friend_code, is_premium")
    .eq("friend_code", code.toUpperCase().trim())
    .single();

  if (!data) return null;
  const u = data as any;
  return {
    id: u.id,
    displayName: u.display_name ?? "User",
    friendCode: u.friend_code,
    isPremium: u.is_premium ?? false,
    avatarInitial: initial(u.display_name),
  };
}

// ── Friend requests ───────────────────────────────────────────────────────

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests" as any)
    .insert({ sender_id: senderId, receiver_id: receiverId } as any);
  if (error) throw new Error(error.message);
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests" as any)
    .update({ status: "accepted", updated_at: new Date().toISOString() } as any)
    .eq("id", requestId);
  if (error) throw new Error(error.message);
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests" as any)
    .update({ status: "declined", updated_at: new Date().toISOString() } as any)
    .eq("id", requestId);
  if (error) throw new Error(error.message);
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests" as any)
    .delete()
    .eq("id", requestId);
  if (error) throw new Error(error.message);
}

// ── Get pending requests ──────────────────────────────────────────────────

export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data } = await supabase
    .from("friend_requests" as any)
    .select("id, sender_id, receiver_id, status, created_at")
    .eq("status", "pending")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (!data) return [];
  const otherIds = (data as any[]).map((r: any) => r.sender_id === userId ? r.receiver_id : r.sender_id);

  // Fetch profiles for other users
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", otherIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name ?? "User"]));

  return (data as any[]).map((r: any) => {
    const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
    const name = profileMap.get(otherId) ?? "User";
    return {
      friendshipId: r.id,
      userId: otherId,
      displayName: name,
      avatarInitial: initial(name),
      direction: r.sender_id === userId ? "sent" as const : "received" as const,
      requestedAt: r.created_at,
    };
  });
}

// ── Get friends ───────────────────────────────────────────────────────────

export async function getFriends(userId: string): Promise<Friend[]> {
  const { data } = await supabase
    .from("friendships" as any)
    .select("user_id_a, user_id_b, created_at")
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);

  if (!data || (data as any[]).length === 0) return [];

  const friendIds = (data as any[]).map((f: any) => f.user_id_a === userId ? f.user_id_b : f.user_id_a);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, friend_code, is_premium")
    .in("id", friendIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return (data as any[]).map((f: any) => {
    const friendId = f.user_id_a === userId ? f.user_id_b : f.user_id_a;
    const profile = profileMap.get(friendId);
    const name = profile?.display_name ?? "User";
    return {
      friendshipId: `${f.user_id_a}:${f.user_id_b}`, // canonical pair
      userId: friendId,
      displayName: name,
      friendCode: profile?.friend_code ?? null,
      isPremium: profile?.is_premium ?? false,
      avatarInitial: initial(name),
      friendsSince: f.created_at,
    };
  });
}

// ── Remove friend ─────────────────────────────────────────────────────────

export async function removeFriend(friendshipId: string): Promise<void> {
  const [a, b] = friendshipId.split(":");
  if (!a || !b) throw new Error("Invalid friendship ID");
  const { error } = await supabase
    .from("friendships" as any)
    .delete()
    .eq("user_id_a", a)
    .eq("user_id_b", b);
  if (error) throw new Error(error.message);
}

// ── Friend leaderboard ───────────────────────────────────────────────────

export async function getFriendLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  // Get friend IDs
  const friends = await getFriends(userId);
  const allIds = [userId, ...friends.map(f => f.userId)];

  const { data } = await supabase
    .from("leaderboard_entries")
    .select("user_id, display_name, rating, skill_tier, solve_count")
    .in("user_id", allIds)
    .order("rating", { ascending: false });

  return (data ?? []).map((e: any) => ({
    userId: e.user_id,
    displayName: e.display_name ?? "User",
    avatarInitial: initial(e.display_name),
    rating: e.rating ?? 0,
    tier: e.skill_tier ?? "Beginner",
    solveCount: e.solve_count ?? 0,
  }));
}

// ── Friend activity (recent daily scores) ────────────────────────────────

export async function getFriendActivity(userId: string): Promise<ActivityEntry[]> {
  const friends = await getFriends(userId);
  const friendIds = friends.map(f => f.userId);
  if (friendIds.length === 0) return [];

  const { data } = await supabase
    .from("daily_scores")
    .select("user_id, display_name, puzzle_type, solve_time, date_str")
    .in("user_id", friendIds)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((d: any) => ({
    userId: d.user_id,
    displayName: d.display_name ?? "User",
    avatarInitial: initial(d.display_name),
    puzzleType: d.puzzle_type,
    solveTime: d.solve_time,
    dateStr: d.date_str,
  }));
}

// ── Get relationship status with another user ────────────────────────────

export async function getFriendStatus(
  userId: string, otherUserId: string
): Promise<"none" | "friends" | "pending_sent" | "pending_received"> {
  // Check friendships
  const a = userId < otherUserId ? userId : otherUserId;
  const b = userId < otherUserId ? otherUserId : userId;
  const { data: fs } = await supabase
    .from("friendships" as any)
    .select("user_id_a")
    .eq("user_id_a", a)
    .eq("user_id_b", b)
    .maybeSingle();
  if (fs) return "friends";

  // Check pending requests
  const { data: reqs } = await supabase
    .from("friend_requests" as any)
    .select("sender_id")
    .eq("status", "pending")
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`);

  if (reqs && (reqs as any[]).length > 0) {
    return (reqs as any[])[0].sender_id === userId ? "pending_sent" : "pending_received";
  }
  return "none";
}
