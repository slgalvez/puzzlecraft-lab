/**
 * SocialTab.tsx  ← FULL REPLACEMENT
 * src/components/social/SocialTab.tsx
 *
 * Fully wired Social tab. All three data sources live:
 *   1. Friends daily leaderboard  — today's solve times vs friends
 *   2. Friend streaks             — who has the longest daily streak
 *   3. Activity feed              — recent friend daily solves + craft puzzle solves
 *
 * Plus all request/friend management UI from v1.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Users, UserPlus, Search, X, Check,
  ChevronRight, Trophy, Flame, Copy,
  UserMinus, Clock, Activity, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFriends, type FriendWithStats, type PendingRequest } from "@/hooks/useFriends";
import { useFriendActivity, type FriendActivityItem } from "@/hooks/useFriendActivity";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { getTierColor } from "@/lib/solveScoring";
import { useToast } from "@/hooks/use-toast";
import { hapticTap } from "@/lib/haptic";

// ── Format helpers ────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtRelative(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_LABELS: Record<string, string> = {
  crossword:    "Crossword",
  "word-search":"Word Search",
  cryptogram:   "Cryptogram",
  "word-fill":  "Word Fill-In",
  "number-fill":"Number Fill-In",
  sudoku:       "Sudoku",
  kakuro:       "Kakuro",
  nonogram:     "Nonogram",
  puzzle:       "puzzle",
};

// ── Empty state ───────────────────────────────────────────────────────────

function SocialEmptyState({ onAddFriends }: { onAddFriends: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
        <Users size={28} className="text-primary" />
      </div>
      <h2 className="font-display text-xl font-bold text-foreground mb-2">
        Play with friends
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        Add friends to compare solve times, see who's on a streak, and follow each other's activity.
      </p>
      <div className="w-full max-w-xs space-y-2">
        <Button onClick={onAddFriends} className="w-full gap-2">
          <UserPlus size={15} /> Add Friends
        </Button>
        <Button variant="outline" className="w-full gap-2" asChild>
          <Link to="/craft">
            Share a puzzle instead →
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ── Add friends panel ─────────────────────────────────────────────────────

function AddFriendsPanel({
  onClose,
  myCode,
}: {
  onClose: () => void;
  myCode: string | null | undefined;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const {
    search, searchResults, searchLoading, searchError, clearSearch,
    sendRequest, getRelationship,
  } = useFriends();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length >= 2) search(debounced);
    else clearSearch();
  }, [debounced, search, clearSearch]);

  useEffect(() => {
    (async () => {
      const next: Record<string, string> = {};
      for (const r of searchResults) next[r.id] = await getRelationship(r.id);
      setStatuses(next);
    })();
  }, [searchResults, getRelationship]);

  const handleSend = async (targetId: string, name: string) => {
    try {
      await sendRequest.mutateAsync(targetId);
      setStatuses((p) => ({ ...p, [targetId]: "sent" }));
      toast({ title: `Friend request sent to ${name}` });
    } catch (e: any) {
      toast({ title: "Couldn't send request", description: e.message, variant: "destructive" });
    }
  };

  const copyMyCode = async () => {
    if (!myCode) return;
    await navigator.clipboard.writeText(myCode);
    toast({ title: "Friend code copied!" });
  };

  return (
    <div className="space-y-4">
      {myCode && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Your Friend Code
          </p>
          <div className="flex items-center justify-between gap-3">
            <code className="font-mono text-lg font-bold text-foreground tracking-wider">{myCode}</code>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copyMyCode}>
              <Copy size={12} /> Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this with friends so they can find you
          </p>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Friend code (PC-XXXXXX) or username…"
          className="pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button onClick={() => { setQuery(""); clearSearch(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={13} />
          </button>
        )}
      </div>

      {searchLoading && <p className="text-xs text-muted-foreground text-center py-3">Searching…</p>}
      {searchError  && <p className="text-xs text-destructive text-center py-3">{searchError}</p>}
      {!searchLoading && searchResults.length === 0 && debounced.length >= 2 && (
        <p className="text-xs text-muted-foreground text-center py-3">No users found.</p>
      )}

      {searchResults.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {searchResults.map((user, i) => {
            const status = statuses[user.id] ?? "none";
            return (
              <div key={user.id} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/40")}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-bold text-primary">{user.displayName[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.displayName}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/60">{user.friendCode}</p>
                </div>
                {status === "friends"  && <span className="text-xs text-primary font-medium">Friends ✓</span>}
                {status === "sent"     && <span className="text-xs text-muted-foreground">Sent</span>}
                {status === "received" && <span className="text-xs text-primary font-medium">Respond ↑</span>}
                {status === "none" && (
                  <Button size="sm" variant="outline" className="gap-1 h-8 shrink-0"
                    onClick={() => handleSend(user.id, user.displayName)}
                    disabled={sendRequest.isPending}>
                    <UserPlus size={12} /> Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onClose} className="w-full text-xs text-muted-foreground py-2 hover:text-foreground transition-colors">
        Done
      </button>
    </div>
  );
}

// ── Pending requests ──────────────────────────────────────────────────────

function PendingRequestsPanel({ requests }: { requests: PendingRequest[] }) {
  const { acceptRequest, declineRequest } = useFriends();
  const { toast } = useToast();
  if (requests.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
        Friend Requests ({requests.length})
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {requests.map((req, i) => (
          <div key={req.requestId} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/40")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
              <span className="text-sm font-bold text-foreground">{req.sender.displayName[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{req.sender.displayName}</p>
              <p className="text-[10px] text-muted-foreground/60 font-mono">{req.sender.friendCode}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={async () => {
                await declineRequest.mutateAsync(req.requestId);
                toast({ title: "Request declined" });
              }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                <X size={14} />
              </button>
              <button onClick={async () => {
                await acceptRequest.mutateAsync(req.requestId);
                toast({ title: `${req.sender.displayName} added!` });
              }} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Friends daily leaderboard ─────────────────────────────────────────────

function FriendsDailyLeaderboard() {
  const { dailyLeaderboard, loading: dailyLoading } = useFriendActivity();

  if (dailyLoading) return null;
  if (dailyLeaderboard.length === 0) return (
    <div className="rounded-xl border bg-card px-4 py-4 text-center">
      <p className="text-xs text-muted-foreground">
        No one in your friends list has solved today's daily yet.
      </p>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Today's Daily</p>
        </div>
        <p className="text-[10px] text-muted-foreground/60">{today}</p>
      </div>

      {dailyLeaderboard.map((entry, i) => (
        <div
          key={entry.friendId}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            i > 0 && "border-t border-border/40",
            entry.isMe && "bg-primary/5"
          )}
        >
          <span className="w-6 text-center text-sm shrink-0">
            {i < 3 ? MEDALS[i] : <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>}
          </span>
          <p className={cn(
            "flex-1 text-sm truncate",
            entry.isMe ? "font-semibold text-primary" : "text-foreground"
          )}>
            {entry.isMe ? "You" : entry.displayName}
          </p>
          <span className={cn(
            "font-mono text-sm font-semibold tabular-nums shrink-0",
            entry.isMe ? "text-primary" : "text-foreground"
          )}>
            {fmtTime(entry.solveTime)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Friend streaks leaderboard ────────────────────────────────────────────

function FriendStreaks() {
  const { friendStreaks, loading } = useFriendActivity();
  if (loading || friendStreaks.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
        Active Streaks
      </p>
      <div className="rounded-xl border bg-card overflow-hidden">
        {friendStreaks.map((f, i) => (
          <div key={f.friendId} className={cn(
            "flex items-center gap-3 px-4 py-3",
            i > 0 && "border-t border-border/40"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{f.displayName[0].toUpperCase()}</span>
            </div>
            <p className="flex-1 text-sm font-medium text-foreground truncate">{f.displayName}</p>
            <div className="flex items-center gap-1 shrink-0">
              <Flame size={13} className="text-primary" />
              <span className="font-mono text-sm font-bold text-foreground">{f.currentStreak}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">day{f.currentStreak !== 1 ? "s" : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────

function ActivityFeed() {
  const navigate = useNavigate();
  const { activityFeed, loading } = useFriendActivity();

  if (loading) return null;
  if (activityFeed.length === 0) return (
    <div className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-center">
      <p className="text-xs text-muted-foreground">
        Friend activity from the last 48 hours will appear here.
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <Activity size={12} className="text-muted-foreground" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </p>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        {activityFeed.map((item, i) => (
          <button
            key={item.id}
            onClick={() => {
              hapticTap();
              if (item.type === "craft_solve" && item.puzzleId) navigate(`/s/${item.puzzleId}`);
              else if (item.type === "daily_solve") navigate("/daily");
            }}
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40",
              i > 0 && "border-t border-border/40"
            )}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary mt-0.5">
              <span className="text-xs font-semibold text-foreground uppercase">
                {item.actorName[0]}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">
                {item.type === "daily_solve" ? (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" solved the daily "}
                    <span className="text-muted-foreground capitalize">
                      {TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                    </span>
                    {item.solveTime != null && (
                      <span className="text-muted-foreground">
                        {" in "}
                        <span className="font-mono font-semibold text-foreground">
                          {fmtTime(item.solveTime)}
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{item.actorName}</span>
                    {" solved your "}
                    {TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                    {item.solveTime != null && (
                      <span className="text-muted-foreground">
                        {" in "}
                        <span className="font-mono font-semibold text-foreground">
                          {fmtTime(item.solveTime)}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground">
                  {fmtRelative(item.timestamp)}
                </p>
                {item.type === "craft_solve" && item.puzzleId && (
                  <span className="text-[10px] text-primary font-medium">View →</span>
                )}
                {item.type === "daily_solve" && (
                  <span className="text-[10px] text-muted-foreground/50">Daily challenge</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Friends rating leaderboard ────────────────────────────────────────────

const FriendsRatingLeaderboard = React.forwardRef<HTMLDivElement, { friends: FriendWithStats[] }>(
  function FriendsRatingLeaderboard({ friends }, ref) {
    const ranked = [...friends]
      .filter((f) => f.rating !== null)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    if (ranked.length === 0) return null;

    return (
      <div ref={ref}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
          Rating Leaderboard
        </p>
        <div className="rounded-xl border bg-card overflow-hidden">
          {ranked.map((friend, i) => (
            <div key={friend.id} className={cn(
              "flex items-center gap-3 px-4 py-3",
              i > 0 && "border-t border-border/40"
            )}>
              <span className="w-5 text-center text-sm shrink-0">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{friend.displayName}</p>
                {friend.skillTier && (
                  <p className={cn("text-[10px] font-semibold", getTierColor(friend.skillTier as any))}>
                    {friend.skillTier}
                  </p>
                )}
              </div>
              <span className="font-mono text-sm font-bold text-foreground shrink-0">{friend.rating}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

// ── Friend list ───────────────────────────────────────────────────────────

const FriendsList = React.forwardRef<HTMLDivElement, { friends: FriendWithStats[] }>(
  function FriendsList({ friends }, ref) {
    const { removeFriend } = useFriends();
    const { toast } = useToast();
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    return (
      <div ref={ref}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
          Friends ({friends.length})
        </p>
        <div className="rounded-xl border bg-card overflow-hidden">
          {friends.map((friend, i) => (
            <div key={friend.id} className={cn(
              "flex items-center gap-3 px-4 py-3 group",
              i > 0 && "border-t border-border/40"
            )}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">{friend.displayName[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{friend.displayName}</p>
                <p className="text-[10px] text-muted-foreground/60">
                  {friend.skillTier ? (
                    <span className={cn("font-semibold", getTierColor(friend.skillTier as any))}>
                      {friend.skillTier}
                    </span>
                  ) : "No rating yet"}
                  {friend.solveCount != null && (
                    <span className="ml-1.5 text-muted-foreground/40">· {friend.solveCount} solves</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirmRemove === friend.id) {
                    removeFriend.mutateAsync(friend.id).then(() =>
                      toast({ title: `${friend.displayName} removed` })
                    );
                    setConfirmRemove(null);
                  } else {
                    setConfirmRemove(friend.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors shrink-0",
                  confirmRemove === friend.id
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100"
                )}
              >
                {confirmRemove === friend.id ? <><X size={11} /> Confirm</> : <UserMinus size={12} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

// ── Main SocialTab ─────────────────────────────────────────────────────────

interface SocialTabProps {
  myRating: number | null;
}

export function SocialTab({ myRating }: SocialTabProps) {
  const { account } = useUserAccount();
  const { myFriendCode, friends, friendsLoading, pendingRequests, pendingLoading } = useFriends();
  const [showAddFriends, setShowAddFriends] = useState(false);
  const { toast } = useToast();

  // Not signed in
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Users size={24} className="text-muted-foreground" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground mb-2">Sign in to add friends</h2>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs">
          Create a free account to add friends and compare times.
        </p>
        <Button asChild><Link to="/account">Sign in / Create account</Link></Button>
      </div>
    );
  }

  const loading = friendsLoading || pendingLoading;
  const hasFriends = friends.length > 0;
  const hasPending = pendingRequests.length > 0;

  if (loading && !hasFriends && !hasPending) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>;
  }

  if (showAddFriends) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddFriends(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </button>
          <p className="text-sm font-semibold text-foreground">Add Friends</p>
        </div>
        <AddFriendsPanel onClose={() => setShowAddFriends(false)} myCode={myFriendCode} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Pending requests — always top if present */}
      {hasPending && <PendingRequestsPanel requests={pendingRequests} />}

      {/* No friends yet */}
      {!hasFriends && !hasPending && (
        <SocialEmptyState onAddFriends={() => setShowAddFriends(true)} />
      )}

      {/* Social content — only shown when at least one friend exists */}
      {hasFriends && (
        <>
          {/* 1. Today's daily leaderboard — most immediate, time-sensitive */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
              Today vs Friends
            </p>
            <FriendsDailyLeaderboard />
          </div>

          {/* 2. Recent activity feed */}
          <ActivityFeed />

          {/* 3. Active streaks */}
          <FriendStreaks />

          {/* 4. Rating leaderboard — slower-moving, lower priority */}
          <FriendsRatingLeaderboard friends={friends} />

          {/* 5. Full friends list */}
          <FriendsList friends={friends} />
        </>
      )}

      {/* Add friends CTA — always visible */}
      <button
        onClick={() => setShowAddFriends(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
      >
        <UserPlus size={14} />
        {hasFriends ? "Add more friends" : "Add friends"}
      </button>

      {/* My code — always bottom */}
      {myFriendCode && (
        <button
          className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-auto pt-1"
          onClick={async () => {
            await navigator.clipboard.writeText(myFriendCode);
            toast({ title: "Friend code copied!" });
          }}
        >
          <span>Your code: <span className="font-mono tracking-wider">{myFriendCode}</span></span>
          <Copy size={10} />
        </button>
      )}
    </div>
  );
}
