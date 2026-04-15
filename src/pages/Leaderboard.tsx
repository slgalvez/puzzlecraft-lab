/**
 * Leaderboard.tsx
 * src/pages/Leaderboard.tsx
 *
 * Tabbed leaderboard: Overall + per-puzzle-type.
 * Real data only — no demo/fake entries.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { CATEGORY_INFO, type PuzzleCategory } from "@/lib/puzzleTypes";
import { cn } from "@/lib/utils";
import {
  Trophy, Medal, Shield, TrendingUp, TrendingDown,
  Zap, ArrowRight, Info, ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSolveRecords } from "@/lib/solveTracker";
import {
  computePlayerRating,
  computeTypeRating,
  getSkillTier,
  getTierColor,
  getTierProgress,
  LEADERBOARD_MIN_SOLVES,
  TYPE_LEADERBOARD_MIN_SOLVES,
} from "@/lib/solveScoring";
import { hasPremiumAccess } from "@/lib/premiumAccess";

// ── Types ──────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  rating: number;
  previous_rating: number;
  skill_tier: string;
  solve_count: number;
  updated_at: string;
}

type TabType = "global" | PuzzleCategory;
type TimeFilter = "all" | "week";

const PUZZLE_TYPES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

// ── Sub-components ─────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Expert:   "text-amber-500",
  Advanced: "text-primary",
  Skilled:  "text-emerald-500",
  Casual:   "text-sky-500",
  Beginner: "text-muted-foreground",
};

const TIER_BG: Record<string, string> = {
  Expert:   "bg-amber-500/10",
  Advanced: "bg-primary/10",
  Skilled:  "bg-emerald-500/10",
  Casual:   "bg-sky-500/10",
  Beginner: "bg-muted/50",
};

const TIER_THRESHOLDS_DISPLAY: { tier: string; min: number }[] = [
  { tier: "Expert",   min: 1650 },
  { tier: "Advanced", min: 1300 },
  { tier: "Skilled",  min: 850  },
  { tier: "Casual",   min: 650  },
  { tier: "Beginner", min: 0    },
];

function getNextTier(currentTier: string): { name: string; threshold: number } | null {
  const idx = TIER_THRESHOLDS_DISPLAY.findIndex((t) => t.tier === currentTier);
  if (idx <= 0) return null;
  return { name: TIER_THRESHOLDS_DISPLAY[idx - 1].tier, threshold: TIER_THRESHOLDS_DISPLAY[idx - 1].min };
}

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
      diff > 0 ? "text-emerald-500" : "text-destructive",
    )}>
      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {diff > 0 ? "+" : ""}{diff}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Leaderboard() {
  const navigate = useNavigate();
  const { account, subscribed } = useUserAccount();
  const isAdmin       = account?.isAdmin ?? false;
  const premiumAccess = hasPremiumAccess({ subscribed, isAdmin });

  const [activeTab,  setActiveTab]  = useState<TabType>("global");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const isGlobal  = activeTab === "global";
  const puzzleType = isGlobal ? null : activeTab as PuzzleCategory;

  // ── Local rating data for "Your Rank" card ─────────────────────────────
  const localRating = useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    const minSolves = isGlobal ? LEADERBOARD_MIN_SOLVES : TYPE_LEADERBOARD_MIN_SOLVES;
    if (!isGlobal && puzzleType) {
      const typeRecords = records.filter((r) => r.puzzleType === puzzleType);
      if (typeRecords.length < minSolves) return null;
      const rating = computeTypeRating(records, puzzleType);
      const tier   = getSkillTier(rating, typeRecords.length);
      return { rating, tier, solveCount: typeRecords.length };
    }
    if (records.length < LEADERBOARD_MIN_SOLVES) return null;
    const rating = computePlayerRating(records);
    const tier   = getSkillTier(rating, records.length);
    return { rating, tier, solveCount: records.length };
  }, [isGlobal, puzzleType]);

  const localSolveCount = useMemo(() => {
    const records = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (!isGlobal && puzzleType) {
      return records.filter((r) => r.puzzleType === puzzleType).length;
    }
    return records.length;
  }, [isGlobal, puzzleType]);

  const minSolves = isGlobal ? LEADERBOARD_MIN_SOLVES : TYPE_LEADERBOARD_MIN_SOLVES;
  const solvesNeeded = Math.max(0, minSolves - localSolveCount);

  // ── Global leaderboard query ───────────────────────────────────────────
  const { data: globalEntries, isLoading: globalLoading } = useQuery({
    queryKey: ["leaderboard-global", timeFilter],
    queryFn: async () => {
      let query = supabase
        .from("leaderboard_entries")
        .select("user_id, display_name, rating, previous_rating, skill_tier, solve_count, updated_at")
        .gte("solve_count", LEADERBOARD_MIN_SOLVES)
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
    enabled: isGlobal,
    staleTime: 30_000,
  });

  // ── Per-type leaderboard query ─────────────────────────────────────────
  const { data: typeEntries, isLoading: typeLoading } = useQuery({
    queryKey: ["leaderboard-type", puzzleType, timeFilter],
    queryFn: async () => {
      if (!puzzleType) return [];

      let query = (supabase as any)
        .from("type_leaderboard_entries")
        .select("user_id, display_name, rating, previous_rating, skill_tier, solve_count, updated_at")
        .eq("puzzle_type", puzzleType)
        .gte("solve_count", TYPE_LEADERBOARD_MIN_SOLVES)
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
    enabled: !isGlobal && !!puzzleType,
    staleTime: 30_000,
  });

  const rawEntries = isGlobal ? (globalEntries ?? []) : (typeEntries ?? []);
  const isLoading  = isGlobal ? globalLoading : typeLoading;

  const ranked = useMemo(() => {
    return [...rawEntries]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 25)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [rawEntries]);

  const myEntry = useMemo(
    () => (account ? ranked.find((e) => e.user_id === account.id) : null),
    [ranked, account],
  );

  const nextTier     = localRating ? getNextTier(localRating.tier) : null;
  const tierProgress = localRating ? getTierProgress(localRating.rating) : 0;
  const ratingChange = myEntry ? myEntry.rating - myEntry.previous_rating : 0;

  const typeLabel = puzzleType ? (CATEGORY_INFO[puzzleType]?.name ?? puzzleType) : null;

  return (
    <Layout>
      <div className="container py-6 md:py-12 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Shield size={22} className="text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Leaderboard
          </h1>
        </div>
        <p className="text-muted-foreground mb-6">
          {isGlobal
            ? `Top players ranked by Player Rating. Minimum ${LEADERBOARD_MIN_SOLVES} solves to qualify.`
            : `Top ${typeLabel} players. Minimum ${TYPE_LEADERBOARD_MIN_SOLVES} solves of this type to qualify.`}
        </p>

        {/* Your Rank card — premium + enough solves */}
        {premiumAccess && localRating && (
          <div className="mb-6 rounded-2xl border-2 border-primary/20 bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Rank</span>
                  {myEntry && (
                    <span className="font-mono font-bold text-sm text-primary">#{myEntry.rank}</span>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-1 -m-1 min-w-[28px] min-h-[28px] flex items-center justify-center">
                          <Info size={12} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-52 text-xs leading-relaxed">
                        <p className="font-medium mb-1">Rating is based on:</p>
                        <ul className="space-y-0.5 text-muted-foreground">
                          <li>• Puzzle difficulty</li>
                          <li>• Solve speed vs. expected</li>
                          <li>• Accuracy (mistakes)</li>
                          <li>• Hint usage</li>
                        </ul>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                      ratingChange > 0 ? "text-emerald-500" : "text-destructive",
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

        {/* Not enough solves yet nudge */}
        {premiumAccess && !localRating && localSolveCount > 0 && (
          <div className="mb-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Keep solving to earn your rank</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {solvesNeeded} more {isGlobal ? "" : (typeLabel + " ")}solve{solvesNeeded !== 1 ? "s" : ""} needed to qualify.
                  You have {localSolveCount} so far.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Puzzle type nav ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-5">
          <Button
            variant={isGlobal ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("global")}
          >
            Overall
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={!isGlobal ? "default" : "outline"} size="sm">
                {isGlobal ? "Puzzle Type" : typeLabel}
                <ChevronDown size={14} className="ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {PUZZLE_TYPES.map((pt) => (
                <DropdownMenuItem
                  key={pt}
                  onClick={() => setActiveTab(pt)}
                  className={cn(activeTab === pt && "font-semibold")}
                >
                  {CATEGORY_INFO[pt]?.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && ranked.length === 0 && (
          <div className="rounded-xl border bg-card p-8 text-center space-y-3">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="font-display text-base font-semibold text-foreground">
              {timeFilter === "week"
                ? "No active players this week"
                : isGlobal
                  ? "Be the first on the board"
                  : `No ${typeLabel} players yet`}
            </p>
            <p className="text-sm text-muted-foreground">
              {timeFilter === "week"
                ? "Switch to All Time, or come back after playing."
                : `Solve at least ${minSolves} ${isGlobal ? "" : (typeLabel + " ")}puzzles while signed in to qualify.`}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to={isGlobal ? "/daily" : `/quick-play/${puzzleType}`}>
                {isGlobal ? "Play Today's Challenge" : `Play ${typeLabel}`}
                <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* Leaderboard table */}
        {!isLoading && ranked.length > 0 && ranked.length < 3 && (
          <p className="text-xs text-muted-foreground text-center mb-3 italic">
            Early leaderboard — be one of the first to rank
          </p>
        )}

        {!isLoading && ranked.length > 0 && (
          <TooltipProvider>
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-2 border-b bg-secondary/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">#</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Player</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Rating</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right cursor-default">
                      +/−
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Rating change (recent)</TooltipContent>
                </Tooltip>
              </div>

              {ranked.map((entry) => {
                const isMe = account?.id === entry.user_id;
                return (
                  <div
                    key={`${entry.user_id}-${activeTab}`}
                    className={cn(
                      "grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-3 border-b last:border-0",
                      isMe && "bg-primary/5 border-l-2 border-l-primary",
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
                      {(() => {
                        const computedTier = getSkillTier(entry.rating, entry.solve_count);
                        return (
                          <span className={cn(
                            "inline-block rounded-full px-1.5 py-0 text-[9px] font-medium",
                            TIER_BG[computedTier],
                            TIER_COLORS[computedTier] ?? "text-muted-foreground",
                          )}>
                            {computedTier}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="font-mono text-sm font-bold text-foreground text-right">
                      {entry.rating}
                    </p>
                    <div className="text-right">
                      <RatingChange current={entry.rating} previous={entry.previous_rating} />
                    </div>
                  </div>
                );
              })}

              {/* Current user outside top 25 */}
              {account && myEntry && myEntry.rank > 25 && (
                <>
                  <div className="px-4 py-1 text-center text-[10px] text-muted-foreground border-t">···</div>
                  <div className="grid grid-cols-[40px_1fr_80px_60px] items-center px-4 py-3 border-t bg-primary/5 border-l-2 border-l-primary">
                    <div className="flex items-center justify-center">
                      <span className="text-xs font-bold font-mono text-muted-foreground">#{myEntry.rank}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {myEntry.display_name}
                        <span className="text-[10px] text-muted-foreground ml-1.5">• YOU</span>
                      </p>
                      {(() => {
                        const computedTier = getSkillTier(myEntry.rating, myEntry.solve_count);
                        return (
                          <span className={cn(
                            "inline-block rounded-full px-1.5 py-0 text-[9px] font-medium",
                            TIER_BG[computedTier],
                            TIER_COLORS[computedTier] ?? "text-muted-foreground",
                          )}>
                            {computedTier}
                          </span>
                        );
                      })()}
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

        {/* Sign-in prompt */}
        {!account && !isLoading && (
          <div className="mt-6 rounded-xl border border-dashed bg-card p-5 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in and solve {minSolves}+ puzzles to appear on the leaderboard.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/account">Sign in <ArrowRight size={14} className="ml-1.5" /></Link>
            </Button>
          </div>
        )}
        {/* Tier legend */}
        <Collapsible className="mt-8">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
              <Info size={14} />
              <span className="font-medium">Skill Tiers</span>
              <ChevronDown size={12} className="ml-auto transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-xl border bg-card p-4 space-y-2">
              {TIER_THRESHOLDS_DISPLAY.map((t, i) => {
                const next = i > 0 ? TIER_THRESHOLDS_DISPLAY[i - 1].min - 1 : null;
                return (
                  <div key={t.tier} className="flex items-center gap-3">
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold min-w-[72px] text-center",
                      TIER_BG[t.tier], TIER_COLORS[t.tier],
                    )}>
                      {t.tier}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {t.min}{next ? `–${next}` : "+"}
                    </span>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground pt-2 border-t">
                Rating is based on puzzle difficulty, solve speed, accuracy, and hint usage.
                Higher tiers require more solves to unlock.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Layout>
  );
}
