/**
 * FriendActivityFeed.tsx
 * src/components/FriendActivityFeed.tsx
 *
 * Shows recent puzzle completions from friends.
 * Renders on BOTH iOS and desktop.
 *
 * Uses the existing friendships table + daily_scores for activity data,
 * since user_follows and solve_records tables don't exist in the schema yet.
 *
 * Props:
 *   compact   — short feed (5 items) for IOSPlayTab sidebar
 *   maxItems  — cap the list length
 *   showTitle — whether to render the section heading inside the card
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";
import { Users, Zap, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  user_id: string;
  display_name: string;
  solve_time: number;
  created_at: string;
  date_str: string;
}

interface FriendActivityFeedProps {
  compact?: boolean;
  maxItems?: number;
  showTitle?: boolean;
}

const FriendActivityFeed = ({
  compact = false,
  maxItems = 20,
  showTitle = false,
}: FriendActivityFeedProps) => {
  const { account } = useUserAccount();
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  // ── Load friends list via friendships table ────────────────────────────────
  useEffect(() => {
    if (!account) return;

    const loadFriends = async () => {
      // Get friends where current user is user_id_a
      const { data: asA } = await supabase
        .from("friendships")
        .select("user_id_b")
        .eq("user_id_a", account.id);
      // Get friends where current user is user_id_b
      const { data: asB } = await supabase
        .from("friendships")
        .select("user_id_a")
        .eq("user_id_b", account.id);

      const ids = [
        ...(asA?.map((r) => r.user_id_b) ?? []),
        ...(asB?.map((r) => r.user_id_a) ?? []),
      ];
      setFriendIds(ids);
    };

    loadFriends();
  }, [account]);

  // ── Load activity feed from daily_scores ───────────────────────────────────
  useEffect(() => {
    if (!account || friendIds.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("daily_scores")
          .select("id, user_id, solve_time, display_name, date_str, created_at")
          .in("user_id", friendIds)
          .order("created_at", { ascending: false })
          .limit(maxItems);

        if (error || !data || cancelled) return;

        setItems(
          data.map((row) => ({
            id: row.id,
            user_id: row.user_id ?? "",
            display_name: row.display_name ?? "Puzzler",
            solve_time: row.solve_time ?? 0,
            created_at: row.created_at ?? new Date().toISOString(),
            date_str: row.date_str,
          })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // Auto-refresh every 60 seconds
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [account, friendIds, maxItems]);

  // ── Empty / unauthenticated ────────────────────────────────────────────────
  if (!account) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/5 rounded" />
              <Skeleton className="h-2.5 w-2/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (friendIds.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center">
        <Users size={22} className="mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-semibold text-foreground">No friends yet</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Add friends to see their puzzle activity here
        </p>
        <button
          type="button"
          onClick={() => navigate("/leaderboard")}
          className="mt-3 text-xs font-medium text-primary touch-manipulation"
        >
          Find players →
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">No recent activity from friends</p>
      </div>
    );
  }

  const displayItems = compact ? items.slice(0, 5) : items;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {showTitle && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Users size={14} className="text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Friend Activity
          </p>
        </div>
      )}

      <div className="divide-y divide-border/40">
        {displayItems.map((item) => {
          const relTime = (() => {
            try {
              return formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
            } catch {
              return "recently";
            }
          })();

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* Avatar placeholder */}
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-foreground">
                  {item.display_name.slice(0, 1).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-tight truncate">
                  <span className="font-semibold">{item.display_name}</span>
                  {" "}solved the{" "}
                  <span className="font-medium">Daily Challenge</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {formatTime(item.solve_time)}
                  </span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="text-[10px] text-muted-foreground/60">{relTime}</span>
                </div>
              </div>

              {/* Challenge button */}
              <button
                type="button"
                onClick={() => navigate("/daily")}
                className={cn(
                  "shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1.5",
                  "text-[11px] font-medium text-primary border-primary/30",
                  "active:scale-95 touch-manipulation transition-transform",
                  "min-h-[36px]",
                )}
                aria-label={`Challenge ${item.display_name}`}
              >
                <Zap size={10} />
                Beat it
              </button>
            </div>
          );
        })}
      </div>

      {/* See all link */}
      {compact && items.length > 5 && (
        <button
          type="button"
          onClick={() => navigate("/stats")}
          className="flex items-center justify-center gap-1 w-full py-3 text-xs font-medium text-primary border-t border-border/40 touch-manipulation"
        >
          See all activity <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
};

export default FriendActivityFeed;
