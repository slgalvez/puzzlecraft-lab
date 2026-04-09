/**
 * SocialTab.tsx — Social tab inside Stats page.
 * Handles: not logged in, no friends, pending, friends+leaderboard.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFriends } from "@/hooks/useFriends";
import { AddFriendsSheet } from "@/components/social/AddFriendsSheet";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { CATEGORY_INFO } from "@/lib/puzzleTypes";
import { getTierColor } from "@/lib/solveScoring";

function Avatar({ initial, size = "md" }: { initial: string; size?: "sm"|"md" }) {
  return (
    <div className={cn("rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary",
      size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm")}>
      {initial}
    </div>
  );
}

function PendingRow({ req, onAccept, onDecline, onCancel }: {
  req: any; onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>; onCancel: (id: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const act = async (fn: () => Promise<void>) => { setLoading(true); try { await fn(); } finally { setLoading(false); }};
  const diff = Date.now() - new Date(req.requestedAt).getTime();
  const mins = Math.floor(diff / 60_000);
  const ago = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins/60)}h ago` : `${Math.floor(mins/1440)}d ago`;

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar initial={req.avatarInitial} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{req.displayName}</p>
        <p className="text-[10px] text-muted-foreground">
          {req.direction === "received" ? "Wants to add you" : "Request sent"} · {ago}
        </p>
      </div>
      {req.direction === "received" ? (
        <div className="flex gap-1.5 shrink-0">
          <button onClick={() => act(() => onAccept(req.friendshipId))} disabled={loading}
            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20">
            <Check size={14} className="text-primary" />
          </button>
          <button onClick={() => act(() => onDecline(req.friendshipId))} disabled={loading}
            className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70">
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button onClick={() => act(() => onCancel(req.friendshipId))} disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      )}
    </div>
  );
}

function FriendRow({ friend, onRemove }: { friend: any; onRemove: (id: string) => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar initial={friend.avatarInitial} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{friend.displayName}</p>
          {friend.isPremium && <span className="text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Plus</span>}
        </div>
      </div>
      {confirm ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Remove?</span>
          <button onClick={async () => { setLoading(true); try { await onRemove(friend.friendshipId); } finally { setLoading(false); setConfirm(false); }}}
            disabled={loading} className="text-xs text-destructive font-medium hover:underline">Yes</button>
          <button onClick={() => setConfirm(false)} className="text-xs text-muted-foreground hover:underline">No</button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="text-xs text-muted-foreground hover:text-foreground">···</button>
      )}
    </div>
  );
}

export function SocialTab() {
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const {
    friends, pending, friendLeaderboard, friendActivity,
    friendsLoading, receivedCount, friendCount,
    acceptRequest, declineRequest, cancelRequest, removeFriend,
    isLoggedIn,
  } = useFriends();

  if (!isLoggedIn) return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5">
        <Users size={28} className="text-primary/60" />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground mb-2">Sign in to add friends</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
        Create a free account to connect with friends and compete on a private leaderboard.
      </p>
      <Button onClick={() => navigate("/account")}>Sign in or create account</Button>
    </div>
  );

  const received = pending.filter(p => p.direction === "received");
  const sent     = pending.filter(p => p.direction === "sent");

  return (
    <>
      <div className="space-y-6 mt-6">
        {/* Header + Add button */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Friends {friendCount > 0 && <span className="ml-1 text-xs text-muted-foreground font-normal">{friendCount}</span>}
          </h2>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <UserPlus size={13} /> Add Friend
          </Button>
        </div>

        {/* Incoming requests */}
        {received.length > 0 && (
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-primary/10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {received.length} friend request{received.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="px-4 divide-y divide-border/40">
              {received.map(req => <PendingRow key={req.friendshipId} req={req} onAccept={acceptRequest} onDecline={declineRequest} onCancel={cancelRequest} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!friendsLoading && friendCount === 0 && received.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
              <Users size={24} className="text-primary/60" />
            </div>
            <h3 className="font-semibold text-foreground mb-1.5">Add friends to compete</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
              Compare solve times, follow streaks, and see who's fastest on daily challenges.
            </p>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <UserPlus size={14} /> Add Friends
            </Button>
            <p className="text-xs text-muted-foreground mt-2.5">Share your Friend Code — no email needed</p>
          </div>
        )}

        {friendsLoading && <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>}

        {/* Friend leaderboard */}
        {friendCount > 0 && friendLeaderboard.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Friend Leaderboard</p>
            <div className="rounded-xl border bg-card overflow-hidden">
              {friendLeaderboard.map((entry, i) => (
                <div key={entry.userId} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/40")}>
                  <span className="text-sm font-mono text-muted-foreground w-5 text-center shrink-0">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                  </span>
                  <Avatar initial={entry.avatarInitial} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.displayName}</p>
                    <p className={cn("text-[10px] font-medium", getTierColor(entry.tier as any))}>{entry.tier}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-foreground tabular-nums shrink-0">{entry.rating}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {friendCount > 0 && friendActivity.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent Activity</p>
            <div className="space-y-2">
              {friendActivity.slice(0, 5).map((act, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                  <Avatar initial={act.avatarInitial} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-semibold">{act.displayName}</span>
                      {" "}solved {(CATEGORY_INFO as any)[act.puzzleType]?.name ?? act.puzzleType}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{act.dateStr}</p>
                  </div>
                  <span className="font-mono text-xs text-primary font-bold shrink-0">{formatTime(act.solveTime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friend list */}
        {friends.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Your Friends</p>
            <div className="rounded-xl border bg-card px-4 divide-y divide-border/40">
              {friends.map(f => <FriendRow key={f.friendshipId} friend={f} onRemove={removeFriend} />)}
            </div>
          </div>
        )}

        {/* Sent requests */}
        {sent.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sent ({sent.length})</p>
            <div className="rounded-xl border bg-card px-4 divide-y divide-border/40">
              {sent.map(req => <PendingRow key={req.friendshipId} req={req} onAccept={acceptRequest} onDecline={declineRequest} onCancel={cancelRequest} />)}
            </div>
          </div>
        )}
      </div>
      <AddFriendsSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
