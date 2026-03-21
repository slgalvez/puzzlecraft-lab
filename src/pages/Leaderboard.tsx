import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Shield, TrendingUp, TrendingDown, Zap, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor, getTierProgress } from "@/lib/solveScoring";
import { hasPremiumAccess } from "@/lib/premiumAccess";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  rating: number;
  previous_rating: number;
  skill_tier: string;
  solve_count: number;
  updated_at: string;
}

const TIER_COLORS: Record<string, string> = {
  Expert: "text-amber-500",
  Advanced: "text-orange-500",
  Skilled: "text-emerald-500",
  Casual: "text-sky-500",
  Beginner: "text-muted-foreground",
};

const TIER_BG: Record<string, string> = {
  Expert: "bg-amber-500/10",
  Advanced: "bg-orange-500/10",
  Skilled: "bg-emerald-500/10",
  Casual: "bg-sky-500/10",
  Beginner: "bg-muted/50",
};

const TIER_THRESHOLDS: { tier: string; min: number }[] = [
  { tier: "Expert", min: 1200 },
  { tier: "Advanced", min: 950 },
  { tier: "Skilled", min: 700 },
  { tier: "Casual", min: 400 },
  { tier: "Beginner", min: 0 },
];

function getNextTier(currentTier: string): { name: string; threshold: number } | null {
  const idx = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier);
  if (idx <= 0) return null;
  return { name: TIER_THRESHOLDS[idx - 1].tier, threshold: TIER_THRESHOLDS[idx - 1].min };
}

type TimeFilter = "all" | "week";

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Trophy size={16} className="text-amber-500" />;
  if (rank === 2) return <Medal size={16} className="text-slate-400" />;
  if (rank === 3) return <Medal size={16} className="text-amber-700" />;
  return <span className="text-xs font-bold font-mono text-muted-foreground w-4 text-center">#{rank}</span>;
};

function RatingChange({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0 || previous === 0) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-medium",
      diff > 0 ? "text-emerald-500" : "text-destructive"
    )}>
      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {diff > 0 ? "+" : ""}{diff}
    </span>
  );
}

export default function Leaderboard() {
  const { account, subscribed } = useUserAccount();
  const isAdmin = account?.isAdmin ?? false;
  const premiumAccess = hasPremiumAccess({ isAdmin, subscribed });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", timeFilter],
    queryFn: async () => {
      let query = supabase
        .from("leaderboard_entries")
        .select("user_id, display_name, rating, previous_rating, skill_tier, solve_count, updated_at")
        .gte("solve_count", 10)
        .order("rating", { ascending: false })
        .limit(50);

      if (timeFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("updated_at", weekAgo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 30_000,
  });

  // Demo entries to fill leaderboard when real data is sparse
  const demoEntries = useMemo((): LeaderboardEntry[] => {
    const names = [
      "PuzzleMaster99", "GridNinja", "WordSmithX", "SudokuSage", "CrossKing",
      "BrainBolt", "TileRunner", "ClueHunter", "LogicLion", "NumberWiz",
    ];
    const ratings = [1350, 1180, 1050, 980, 920, 870, 810, 750, 680, 620];
    return names.map((name, i) => {
      const rating = ratings[i];
      const diff = (i % 2 === 0 ? 1 : -1) * (5 + (i * 7) % 35);
      const tier = rating >= 1200 ? "Expert" : rating >= 950 ? "Advanced" : rating >= 700 ? "Skilled" : rating >= 400 ? "Casual" : "Beginner";
      return {
        user_id: `demo-${i}`,
        display_name: name,
        rating,
        previous_rating: rating - diff,
        skill_tier: tier,
        solve_count: 15 + i * 8,
        updated_at: new Date().toISOString(),
      };
    });
  }, []);

  const ranked = useMemo(() => {
    const real = entries ?? [];
    const merged = real.length >= 10 ? real : [...real, ...demoEntries.filter(d => !real.some(r => r.display_name === d.display_name))];
    merged.sort((a, b) => b.rating - a.rating);
    return merged.slice(0, 25).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries, demoEntries]);

  const myEntry = useMemo(
    () => (account ? ranked.find((e) => e.user_id === account.id) : null),
    [ranked, account]
  );

  // Local rating data for Your Rank card
  const localRating = useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (records.length < 10) return null;
    const rating = computePlayerRating(records);
    const tier = getSkillTier(rating);
    return { rating, tier, solveCount: records.length };
  }, []);

  const nextTier = localRating ? getNextTier(localRating.tier) : null;
  const tierProgress = localRating ? getTierProgress(localRating.rating) : 0;
  const ratingChange = myEntry ? myEntry.rating - myEntry.previous_rating : 0;

  const myRankOutside = myEntry && myEntry.rank > 25;
  const displayEntries = ranked.slice(0, 25);

  return (
    <Layout>
      <div className="container py-6 md:py-12 max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={22} className="text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Top players ranked by Player Rating. Minimum 10 completed solves to qualify.
        </p>

        {/* Your Rank Card — premium users */}
        {premiumAccess && localRating && (
          <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Rank</span>
                  {myEntry && (
                    <span className="font-mono font-bold text-sm text-primary">
                      #{myEntry.rank}
                    </span>
                  )}
                </div>
                <p className={cn("text-lg font-semibold", getTierColor(localRating.tier as any))}>
                  {localRating.tier}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="font-mono text-3xl font-bold text-foreground">{localRating.rating}</p>
                  <span className="text-xs text-muted-foreground">Rating</span>
                  {myEntry && myEntry.previous_rating > 0 && ratingChange !== 0 && (
                    <span className={cn(
                      "text-xs font-semibold inline-flex items-center gap-0.5",
                      ratingChange > 0 ? "text-emerald-500" : "text-destructive"
                    )}>
                      {ratingChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {ratingChange > 0 ? "+" : ""}{ratingChange}
                    </span>
                  )}
                </div>
                {nextTier && (
                  <div className="mt-3 max-w-56">
                    <Progress value={tierProgress} className="h-2" />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Next: {nextTier.name} ({nextTier.threshold})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Time filter */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={timeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("all")}
          >
            All Time
          </Button>
          <Button
            variant={timeFilter === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("week")}
          >
            This Week
          </Button>
        </div>

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
              {timeFilter === "week"
                ? "No active players this week. Switch to All Time to see the full leaderboard."
                : "No players on the leaderboard yet. Solve at least 10 puzzles while signed in to appear here."}
            </p>
          </div>
        )}

        {/* Leaderboard list */}
        {!isLoading && displayEntries.length > 0 && (
          <TooltipProvider>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-2 border-b bg-secondary/50">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Player</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Rating</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right cursor-default">+/−</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Rating change (recent)</TooltipContent>
              </Tooltip>
            </div>
            {displayEntries.map((entry) => {
              const isMe = account?.id === entry.user_id;
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-3 border-b last:border-0 transition-colors",
                    isMe && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-center justify-center">
                    <RankBadge rank={entry.rank} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium text-foreground truncate", isMe && "font-semibold")}>
                      {entry.display_name}
                      {isMe && <span className="text-[10px] text-muted-foreground ml-1.5">• YOU</span>}
                    </p>
                    <span className={cn(
                      "inline-block rounded-full px-1.5 py-0 text-[9px] font-medium",
                      TIER_BG[entry.skill_tier],
                      TIER_COLORS[entry.skill_tier] ?? "text-muted-foreground"
                    )}>
                      {entry.skill_tier}
                    </span>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground text-right">{entry.rating}</p>
                  <div className="text-right">
                    <RatingChange current={entry.rating} previous={entry.previous_rating} />
                  </div>
                </div>
              );
            })}

            {/* Show current user outside top 25 */}
            {myRankOutside && myEntry && (
              <>
                <div className="px-4 py-1 text-center text-[10px] text-muted-foreground border-t">
                  ···
                </div>
                <div className="grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-3 border-t bg-primary/5 border-l-2 border-l-primary">
                  <div className="flex items-center justify-center">
                    <span className="text-xs font-bold font-mono text-muted-foreground">#{myEntry.rank}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {myEntry.display_name}
                      <span className="text-[10px] text-muted-foreground ml-1.5">• YOU</span>
                    </p>
                    <span className={cn(
                      "inline-block rounded-full px-1.5 py-0 text-[9px] font-medium",
                      TIER_BG[myEntry.skill_tier],
                      TIER_COLORS[myEntry.skill_tier] ?? "text-muted-foreground"
                    )}>
                      {myEntry.skill_tier}
                    </span>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground text-right">{myEntry.rating}</p>
                  <div className="text-right">
                    <RatingChange current={myEntry.rating} previous={myEntry.previous_rating} />
                  </div>
                </div>
              </>
            )}
          </div>
          </TooltipProvider>
        )}
      </div>
    </Layout>
  );
}
