/**
 * DailyLeaderboard.tsx
 * src/components/DailyLeaderboard.tsx
 *
 * Shows today's top daily challenge solvers.
 * Renders on BOTH desktop and iOS — no platform suppression.
 *
 * Props:
 *   compact  — short list (5 rows) used inside IOSPlayTab
 *   !compact — full page view with more rows
 */

import { useEffect, useState } from "react";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { supabase } from "@/integrations/supabase/client";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardRow {
  rank: number;
  user_id: string;
  display_name: string;
  solve_time: number;
  score: number;
  is_me: boolean;
}

interface DailyLeaderboardProps {
  compact?: boolean;
}

const RANK_ICON = (rank: number) => {
  if (rank === 1) return <Trophy size={13} className="text-yellow-500" />;
  if (rank === 2) return <Medal size={13} className="text-slate-400" />;
  if (rank === 3) return <Medal size={13} className="text-amber-600" />;
  return null;
};

const DailyLeaderboard = ({ compact = false }: DailyLeaderboardProps) => {
  const { account } = useUserAccount();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRow, setMyRow] = useState<LeaderboardRow | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const limit = compact ? 5 : 20;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // Query daily_scores for today — adapt column names to schema
        const { data, error } = await supabase
          .from("daily_scores")
          .select("user_id, solve_time, display_name, date_str")
          .eq("date_str", today)
          .order("solve_time", { ascending: true })
          .limit(limit);

        if (error || !data || cancelled) return;

        const ranked: LeaderboardRow[] = data.map((row, idx) => ({
          rank: idx + 1,
          user_id: row.user_id ?? "",
          display_name: row.display_name ?? "Puzzler",
          solve_time: row.solve_time ?? 0,
          score: 0,
          is_me: row.user_id === account?.id,
        }));

        setRows(ranked);

        // If current user isn't in the top list, fetch their own rank
        if (account && !ranked.some((r) => r.is_me)) {
          const { data: myData } = await supabase
            .from("daily_scores")
            .select("user_id, solve_time, display_name")
            .eq("date_str", today)
            .eq("user_id", account.id)
            .maybeSingle();

          if (myData && !cancelled) {
            const { count } = await supabase
              .from("daily_scores")
              .select("*", { count: "exact", head: true })
              .eq("date_str", today)
              .lt("solve_time", myData.solve_time);

            setMyRow({
              rank: (count ?? 0) + 1,
              user_id: account.id,
              display_name: myData.display_name ?? account.displayName ?? "You",
              solve_time: myData.solve_time ?? 0,
              score: 0,
              is_me: true,
            });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [account, today, limit]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-4 space-y-2.5">
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 flex-1 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-center">
        <Trophy size={22} className="mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-semibold text-foreground">No solves yet today</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Be the first to complete today's challenge!</p>
      </div>
    );
  }

  const showMyRow = myRow && !rows.some((r) => r.is_me);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Crown size={14} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {rows.map((row) => (
          <LeaderboardRowItem key={row.user_id} row={row} />
        ))}

        {/* Gap indicator if current user is not in top list */}
        {showMyRow && (
          <>
            <div className="px-4 py-1.5 flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-border/60" />
              <span className="text-[10px] text-muted-foreground/50">···</span>
              <div className="flex-1 border-t border-dashed border-border/60" />
            </div>
            <LeaderboardRowItem row={myRow} />
          </>
        )}
      </div>
    </div>
  );
};

const LeaderboardRowItem = ({ row }: { row: LeaderboardRow }) => (
  <div
    className={cn(
      "flex items-center gap-3 px-4 py-3 transition-colors",
      row.is_me && "bg-primary/5",
    )}
  >
    {/* Rank */}
    <div className="w-5 flex items-center justify-center shrink-0">
      {RANK_ICON(row.rank) ?? (
        <span className="text-xs font-mono text-muted-foreground">{row.rank}</span>
      )}
    </div>

    {/* Name */}
    <p
      className={cn(
        "flex-1 text-sm font-medium truncate min-w-0",
        row.is_me ? "text-primary font-semibold" : "text-foreground",
      )}
    >
      {row.display_name}
      {row.is_me && (
        <span className="ml-1.5 text-[10px] text-primary/70 font-normal">you</span>
      )}
    </p>

    {/* Time */}
    <div className="text-right shrink-0">
      <p className="text-xs font-mono font-semibold text-foreground">
        {formatTime(row.solve_time)}
      </p>
    </div>
  </div>
);

export default DailyLeaderboard;
