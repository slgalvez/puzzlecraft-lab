import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  rating: number;
  skill_tier: string;
  solve_count: number;
}

const TIER_COLORS: Record<string, string> = {
  Expert: "text-amber-500",
  Advanced: "text-primary",
  Skilled: "text-emerald-500",
  Casual: "text-sky-500",
  Beginner: "text-muted-foreground",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={16} className="text-amber-500" />;
  if (rank === 2) return <Medal size={16} className="text-slate-400" />;
  if (rank === 3) return <Medal size={16} className="text-amber-700" />;
  return <span className="text-xs font-mono text-muted-foreground w-4 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { account } = useUserAccount();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard_entries")
        .select("user_id, display_name, rating, skill_tier, solve_count")
        .gte("solve_count", 10)
        .order("rating", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 30_000,
  });

  const ranked = useMemo(() => {
    if (!entries) return [];
    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries]);

  const myEntry = useMemo(
    () => (account ? ranked.find((e) => e.user_id === account.id) : null),
    [ranked, account]
  );

  return (
    <Layout>
      <div className="container py-6 md:py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={22} className="text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Top players ranked by Player Rating. Minimum 10 completed solves to qualify.
        </p>

        {/* Highlight current user */}
        {myEntry && (
          <div className="mb-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-center gap-4">
            <RankBadge rank={myEntry.rank} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {myEntry.display_name}
                <span className="text-xs text-muted-foreground ml-2">You</span>
              </p>
              <p className={cn("text-xs font-semibold", TIER_COLORS[myEntry.skill_tier] ?? "text-muted-foreground")}>
                {myEntry.skill_tier}
              </p>
            </div>
            <p className="font-mono text-2xl font-bold text-foreground">{myEntry.rating}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ranked.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No players on the leaderboard yet. Solve at least 10 puzzles while signed in to appear here.
            </p>
          </div>
        )}

        {/* Leaderboard list */}
        {!isLoading && ranked.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_100px_80px] items-center px-4 py-2 border-b bg-secondary/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Player</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block text-right">Solves</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Rating</span>
            </div>
            {ranked.map((entry) => {
              const isMe = account?.id === entry.user_id;
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_100px_80px] items-center px-4 py-3 border-b last:border-0 transition-colors",
                    isMe && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-center">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium text-foreground truncate", isMe && "font-semibold")}>
                      {entry.display_name}
                      {isMe && <span className="text-[10px] text-primary ml-1.5">YOU</span>}
                    </p>
                    <p className={cn("text-[11px] font-medium", TIER_COLORS[entry.skill_tier] ?? "text-muted-foreground")}>
                      {entry.skill_tier}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-right hidden sm:block">{entry.solve_count}</p>
                  <p className="font-mono text-sm font-bold text-foreground text-right">{entry.rating}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
