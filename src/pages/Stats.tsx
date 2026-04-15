import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SocialTab } from "@/components/social/SocialTab";
import { useFriends } from "@/hooks/useFriends";
import { Link, useNavigate } from "react-router-dom";
import { EmptyStats } from "@/components/ui/EmptyState";
import Layout from "@/components/layout/Layout";
import { getProgressStats } from "@/lib/progressTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { getDailyStreak, getTotalDailyCompleted } from "@/lib/dailyChallenge";
import { getEndlessStats } from "@/lib/endlessHistory";
import {
  Trophy, Flame, Clock, Target, Calendar,
  Infinity, ArrowRight, TrendingUp, TrendingDown, Shield,
  Zap, Info, ChevronRight, Play, Crown, ShieldCheck,
} from "lucide-react";
import { isNativeApp } from "@/lib/appMode";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PremiumStats from "@/components/account/PremiumStats";
import { PremiumStatsAdminControls } from "@/components/account/PremiumStatsAdminControls";
import { StatsPremiumPreview } from "@/components/account/PremiumPreview";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUserAccount } from "@/contexts/UserAccountContext";
import UpgradeModal from "@/components/premium/UpgradeModal";
import { usePremiumAccess } from "@/lib/premiumAccess";
import { syncLeaderboardRating } from "@/lib/leaderboardSync";

import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, computeSolveScore, getSkillTier, getTierColor, getTierProgress, getPlayerRatingInfo, getTierCardStyle, getTierBadgeStyle, type SkillTier } from "@/lib/solveScoring";
import { getBestInsight } from "@/lib/solveInsights";
import { ProvisionalRatingCard } from "@/components/puzzles/ProvisionalRatingCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCalendar } from "@/components/stats/ActivityCalendar";
import { useViewAsUser } from "@/contexts/ViewAsUserContext";
import {
  getProgressStatsFrom, getSolveRecordsFrom, getDailyStreakFrom,
  getTotalDailyCompletedFrom, getEndlessStatsFrom, getPlayedDatesFrom,
  getDailyCompletionFrom,
} from "@/lib/viewAsOverrides";

// ── Constants ──────────────────────────────────────────────────────────────

type ViewFilter = null | "daily";
const RECENT_COLLAPSED_COUNT = 8;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const TIER_THRESHOLDS: Record<string, number> = {
  Expert: 1200, Advanced: 950, Skilled: 700, Casual: 400, Beginner: 0,
};
const TIER_ORDER_LIST = ["Beginner", "Casual", "Skilled", "Advanced", "Expert"];

const DIFF_COLORS: Record<string, string> = {
  easy:    "bg-emerald-400",
  medium:  "bg-amber-400",
  hard:    "bg-orange-500",
  extreme: "bg-rose-500",
  insane:  "bg-violet-600",
};

// ── Component ──────────────────────────────────────────────────────────────

interface StatsProps {
  viewAsMode?: boolean;
}

const Stats = ({ viewAsMode = false }: StatsProps) => {
  const navigate = useNavigate();
  const native   = isNativeApp();
  const { receivedCount } = useFriends();
  const [dataVersion, setDataVersion] = useState(0);

  // Bump dataVersion on visibility change (user returns after solving) + on mount
  useEffect(() => {
    if (viewAsMode) return;
    const handler = () => {
      if (document.visibilityState === "visible") setDataVersion((v) => v + 1);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [viewAsMode]);

  useEffect(() => { if (!viewAsMode) setDataVersion((v) => v + 1); }, [viewAsMode]);

  // View-as context
  const { viewAsUser } = useViewAsUser();
  const isViewAs = viewAsMode && !!viewAsUser;

  const stats          = useMemo(() => isViewAs ? getProgressStatsFrom(viewAsUser!.completions) : getProgressStats(),                [dataVersion, isViewAs, viewAsUser]);
  const dailyStreak    = useMemo(() => isViewAs ? getDailyStreakFrom(viewAsUser!.dailyData) : getDailyStreak(),                  [dataVersion, isViewAs, viewAsUser]);
  const dailyCompleted = useMemo(() => isViewAs ? getTotalDailyCompletedFrom(viewAsUser!.dailyData) : getTotalDailyCompleted(),          [dataVersion, isViewAs, viewAsUser]);
  const endlessStats   = useMemo(() => isViewAs ? getEndlessStatsFrom(viewAsUser!.endlessData) : getEndlessStats(), [dataVersion, isViewAs, viewAsUser]);
  const endlessSummary = endlessStats ?? {
    totalSessions: 0,
    totalSolved: 0,
    totalTime: 0,
    bestSessionSolved: 0,
    fastestEver: null as number | null,
    recentSessions: [],
  };

  const { isPremium: premiumAccess, showUpgradeCTA: showUpgrade } = usePremiumAccess();
  const { account } = useUserAccount();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Unified rating info — handles provisional, confirmed, and no-data states
  const localRatingInfo = useMemo(() => {
    const recs = isViewAs
      ? getSolveRecordsFrom(viewAsUser!.solves).filter((r) => r.solveTime >= 10)
      : getSolveRecords().filter((r) => r.solveTime >= 10);
    return getPlayerRatingInfo(recs);
  }, [dataVersion, isViewAs, viewAsUser]);

  // Peak rating — highest rolling-window rating across all recorded solves
  const peakRating = useMemo(() => {
    const recs = isViewAs
      ? getSolveRecordsFrom(viewAsUser!.solves).filter((r) => r.solveTime >= 10)
      : getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 5) return null;
    let peak = 0;
    for (let i = 0; i <= recs.length - 5; i++) {
      const window = recs.slice(i, i + 25);
      const avg = window.reduce((s, r) => s + computeSolveScore(r), 0) / window.length;
      peak = Math.max(peak, Math.round(avg));
    }
    return peak;
  }, [dataVersion, isViewAs, viewAsUser]);

  // In view-as mode, fetch the target user's leaderboard entry instead
  const viewAsUserId = isViewAs ? viewAsUser!.id : null;

  const { data: myLeaderboardEntry } = useQuery({
    queryKey: ["my-leaderboard-entry", isViewAs ? viewAsUserId : account?.id, dataVersion],
    queryFn: async () => {
      const targetId = isViewAs ? viewAsUserId : account?.id;
      if (!targetId) return null;
      const { data: entry } = await supabase
        .from("leaderboard_entries")
        .select("rating, previous_rating, skill_tier, solve_count")
        .eq("user_id", targetId)
        .maybeSingle();
      if (!entry) return null;
      const { count } = await supabase
        .from("leaderboard_entries")
        .select("*", { count: "exact", head: true })
        .gt("rating", entry.rating);
      return { ...entry, rank: (count ?? 0) + 1 };
    },
    enabled: isViewAs ? !!viewAsUserId : (!!account && premiumAccess),
    staleTime: 30_000,
  });

  // Merge: use local data when available, fall back to DB leaderboard entry
  const ratingInfo = useMemo((): ReturnType<typeof getPlayerRatingInfo> => {
    if (!localRatingInfo.hasNoData) return localRatingInfo;
    if (myLeaderboardEntry) {
      const dbRating = myLeaderboardEntry.rating;
      const dbTier = getSkillTier(dbRating) as ReturnType<typeof getSkillTier>;
      const dbSolveCount = myLeaderboardEntry.solve_count;
      return {
        rating: dbRating,
        tier: dbTier,
        tierColor: getTierColor(dbTier),
        tierProgress: getTierProgress(dbRating),
        isProvisional: dbSolveCount < 5,
        hasNoData: false,
        solveCount: dbSolveCount,
        solvesUntilConfirmed: Math.max(0, 5 - dbSolveCount),
        solvesUntilLeaderboard: Math.max(0, 10 - dbSolveCount),
        onLeaderboard: dbSolveCount >= 10,
      };
    }
    return localRatingInfo;
  }, [localRatingInfo, myLeaderboardEntry]);

  // Local rating for the inline rating card (uses uploaded file's layout style)
  const localRating = useMemo(() => {
    // In view-as mode, always show rating data if available (ignore premium gate)
    if (isViewAs) {
      if (ratingInfo.hasNoData) return null;
      return {
        rating: ratingInfo.rating,
        tier: ratingInfo.tier,
        solveCount: ratingInfo.solveCount,
        bestRating: peakRating ?? ratingInfo.rating,
      };
    }
    if (!premiumAccess || ratingInfo.hasNoData) return null;
    return {
      rating:     ratingInfo.rating,
      tier:       ratingInfo.tier,
      solveCount: ratingInfo.solveCount,
      bestRating: peakRating ?? ratingInfo.rating,
    };
  }, [premiumAccess, ratingInfo, peakRating, isViewAs]);

  const nextTierInfo = localRating ? (() => {
    const idx = TIER_ORDER_LIST.indexOf(localRating.tier);
    if (idx >= TIER_ORDER_LIST.length - 1) return null;
    const next = TIER_ORDER_LIST[idx + 1];
    return { name: next, threshold: TIER_THRESHOLDS[next] };
  })() : null;

  // Skip sync in view-as mode
  useEffect(() => {
    if (isViewAs) return;
    if (account) syncLeaderboardRating(account.id, account.displayName);
  }, [account, dataVersion, isViewAs]);

  // Filters
  const [viewFilter,     setViewFilter]     = useState<ViewFilter>(null);
  const [categoryFilter, setCategoryFilter] = useState<PuzzleCategory | null>(null);
  const [dateFilter,     setDateFilter]     = useState<string | null>(null);
  const [recentExpanded, setRecentExpanded] = useState(false);

  const handleCategoryChange = (value: string) =>
    setCategoryFilter(value === "all" ? null : (value as PuzzleCategory));

  const filteredCompletions = useMemo(() => {
    let r = stats.recentCompletions;
    if (categoryFilter) r = r.filter((c) => c.category === categoryFilter);
    if (dateFilter)     r = r.filter((c) => c.date.slice(0, 10) === dateFilter);
    return r;
  }, [stats.recentCompletions, categoryFilter, dateFilter]);

  const filteredStatCards = useMemo(() => {
    if (!dateFilter) return null;
    const day = stats.recentCompletions.filter((r) => r.date.slice(0, 10) === dateFilter);
    const cat = categoryFilter ? day.filter((r) => r.category === categoryFilter) : day;
    const totalSolved = cat.length;
    const totalTime   = cat.reduce((s, r) => s + r.time, 0);
    const bestTime    = cat.length > 0 ? Math.min(...cat.map((r) => r.time)) : null;
    return { totalSolved, totalTime, averageTime: totalSolved > 0 ? Math.round(totalTime / totalSolved) : 0, bestTime };
  }, [dateFilter, categoryFilter, stats.recentCompletions]);

  const visibleCompletions = recentExpanded
    ? filteredCompletions
    : filteredCompletions.slice(0, RECENT_COLLAPSED_COUNT);

  const showGeneral = viewFilter === null;
  const showDaily   = viewFilter === null || viewFilter === "daily";
  const showEndless = viewFilter === null;
  const displayStats = filteredStatCards ?? stats;

  const activeFilterLabel = [
    dateFilter && new Date(dateFilter + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    categoryFilter && CATEGORY_INFO[categoryFilter]?.name,
  ].filter(Boolean).join(" · ");

  const tierProgressValue = localRating ? getTierProgress(localRating.rating) : 0;
  const pointsToNext = localRating && nextTierInfo ? nextTierInfo.threshold - localRating.rating : null;
  const nearRank = pointsToNext !== null && nextTierInfo
    ? pointsToNext <= Math.round(nextTierInfo.threshold * 0.12) : false;

  // Streak at-risk
  const streakAtRisk = useMemo(() => {
    if (stats.currentStreak === 0) return false;
    const today = new Date().toISOString().slice(0, 10);
    return stats.solvedDates[0] !== today;
  }, [stats]);

  // Personalized heading
  const headingLabel = useMemo(() => {
    if (stats.totalSolved === 0) return "Your Progress";
    const tierLabel = localRating?.tier ?? null;
    const solveStr  = `${stats.totalSolved.toLocaleString()} solve${stats.totalSolved !== 1 ? "s" : ""}`;
    return tierLabel ? `${tierLabel} · ${solveStr}` : solveStr;
  }, [stats.totalSolved, localRating]);

  // For solve-time bars in recent list
  const overallBest = useMemo(() => {
    const times = filteredCompletions.map((c) => c.time).filter((t) => t > 0);
    return times.length > 0 ? Math.min(...times) : null;
  }, [filteredCompletions]);

  // Empty state
  if (stats.totalSolved === 0) {
    return (
      <Layout>
        <div className="container py-6 md:py-10 max-w-2xl">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl mb-1">
            Your Progress
          </h1>
          <EmptyStats onNavigate={() => navigate("/")} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 md:py-10">

        {/* Page heading */}
        <div className="mb-5">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            {headingLabel}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your solving stats, streaks, and best times.
            {activeFilterLabel && (
              <span className="ml-2 font-medium text-primary">Showing: {activeFilterLabel}</span>
            )}
          </p>
        </div>

        {/* Personal / Social tab switcher */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full mb-6 rounded-xl bg-secondary/60 p-1 h-10">
            <TabsTrigger value="personal" className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Personal
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              Social
              {receivedCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {receivedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-0">

        {/* Streak at-risk banner */}
        {streakAtRisk && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
            <Flame size={16} className="text-destructive shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {stats.currentStreak}-day streak at risk
              </p>
              <p className="text-xs text-muted-foreground">Play today to keep it alive</p>
            </div>
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link to="/daily">
                <Play size={12} className="fill-current" /> Play now
              </Link>
            </Button>
          </div>
        )}

        {/* Two-column desktop layout */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="min-w-0 flex-1 space-y-6">

            {/* ── UNIFIED PLAYER PROFILE CARD ── */}
            {showGeneral && premiumAccess && localRating && (() => {
              const solveRecs = isViewAs
                ? getSolveRecordsFrom(viewAsUser!.solves).filter((r) => r.solveTime >= 10)
                : getSolveRecords().filter((r) => r.solveTime >= 10);
              const noHintCount = solveRecs.filter((r) => r.hintsUsed === 0 && !r.assisted).length;
              const noHintRate = solveRecs.length > 0 ? Math.round((noHintCount / solveRecs.length) * 100) : 0;
              const insight = solveRecs.length >= 3 ? getBestInsight(solveRecs) : null;

              return (
                <div className={cn(
                  "rounded-2xl border p-5 sm:p-6 shadow-sm mb-2",
                  getTierCardStyle(localRating.tier as SkillTier)
                )}>
                  {/* Header row: label + P+ badge + leaderboard */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Player Profile</span>
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-primary">P+</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <Link to="/leaderboard"><Shield size={11} className="mr-0.5" /> Leaderboard</Link>
                    </Button>
                  </div>

                  {/* Tier badge + rating + rank */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                    <div className="flex-1 min-w-0">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2", getTierBadgeStyle(localRating.tier as SkillTier))}>
                        {localRating.tier}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <p className="font-mono text-4xl font-bold text-foreground leading-none">{localRating.rating}</p>
                        <span className="text-xs text-muted-foreground">rating</span>
                        {myLeaderboardEntry && (
                          <span className="font-mono font-bold text-sm text-primary">#{myLeaderboardEntry.rank}</span>
                        )}
                        {myLeaderboardEntry && myLeaderboardEntry.previous_rating > 0 && (() => {
                          const diff = myLeaderboardEntry.rating - myLeaderboardEntry.previous_rating;
                          if (diff === 0) return null;
                          return (
                            <span className={cn("text-xs font-semibold inline-flex items-center gap-0.5",
                              diff > 0 ? "text-emerald-500" : "text-destructive")}>
                              {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          );
                        })()}
                      </div>
                      {localRating.bestRating > localRating.rating && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Peak: {localRating.bestRating}</p>
                      )}

                      {/* Expert crown or progress */}
                      {localRating.tier === "Expert" ? (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Crown size={14} className="text-amber-500" />
                          <span className="text-amber-500 font-medium">Top-tier solver</span>
                        </div>
                      ) : nextTierInfo && (
                        <div className="mt-3 max-w-xs">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {nearRank
                                ? <span className="text-primary font-semibold">Only {pointsToNext} pts to {nextTierInfo.name}!</span>
                                : <>{pointsToNext} pts to {nextTierInfo.name}</>}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">{localRating.rating}/{nextTierInfo.threshold}</span>
                          </div>
                          <Progress value={tierProgressValue} className={cn("h-2", nearRank && "h-2.5")} />
                          {nearRank && (
                            <Link to="/daily" className="text-[10px] text-primary mt-1 font-medium hover:underline">
                              Play a puzzle now to break through →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            })()}

            {/* Premium upgrade teaser — hidden in view-as mode */}
            {showGeneral && showUpgrade && !premiumAccess && !isViewAs && (
              <StatsPremiumPreview onUpgrade={() => setUpgradeOpen(true)} />
            )}

            {/* Premium stats section */}
            {showGeneral && premiumAccess && (
              <>
{account?.isAdmin && !isViewAs && (
                  <PremiumStatsAdminControls onRefresh={() => setDataVersion((v) => v + 1)} />
                )}
                <PremiumStats key={dataVersion} hideAdminControls={isViewAs} overrideSolveRecords={isViewAs ? getSolveRecordsFrom(viewAsUser!.solves) : undefined} />
              </>
            )}

            {/* Recent solves */}
            {filteredCompletions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-base font-semibold text-foreground">Recent Solves</h2>
                  <Select value={categoryFilter ?? "all"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ALL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_INFO[cat]?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border bg-card overflow-hidden">
                  {visibleCompletions.map((c, i) => {
                    const isLast = i === visibleCompletions.length - 1;
                    const barPct = overallBest && c.time > 0
                      ? Math.round(Math.min(100, (overallBest / c.time) * 100)) : 0;
                    const isPB = overallBest !== null && c.time === overallBest;

                    return (
                      <div key={`${c.date}-${i}`}
                        className={cn("flex items-center gap-3 px-4 py-3", !isLast && "border-b border-border/40")}>
                        <div className={cn("h-2 w-2 rounded-full shrink-0", DIFF_COLORS[c.difficulty] ?? "bg-muted-foreground/40")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">
                              {CATEGORY_INFO[c.category]?.name ?? c.category}
                            </span>
                            {isPB && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">PB</span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-border/50 overflow-hidden max-w-[100px]">
                              <div className={cn("h-full rounded-full",
                                barPct >= 90 ? "bg-emerald-500" : barPct >= 70 ? "bg-amber-400" : "bg-muted-foreground/30")}
                                style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground capitalize shrink-0">{c.difficulty}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-semibold text-foreground">{formatTime(c.time)}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredCompletions.length > RECENT_COLLAPSED_COUNT && (
                  <button onClick={() => setRecentExpanded((v) => !v)}
                    className="mt-2 w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors text-center py-1">
                    {recentExpanded ? "Show less" : `Show all ${filteredCompletions.length} solves`}
                  </button>
                )}
              </div>
            )}

          </div>
          {/* ── end LEFT COLUMN ── */}

          {/* ── RIGHT COLUMN ── */}
          <div className="w-full space-y-5 md:sticky md:top-24 md:w-[320px] md:shrink-0 lg:w-[360px]">

            {/* Activity calendar */}
            {showGeneral && (
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Calendar size={13} className="text-primary" />
                  <h2 className="font-display text-sm font-semibold text-foreground">Activity</h2>
                </div>
                <div className="px-3 py-3">
                  <ActivityCalendar
                    overridePlayedDates={isViewAs ? getPlayedDatesFrom(viewAsUser!.completions) : undefined}
                    overrideDailyFn={isViewAs ? (dateStr: string) => getDailyCompletionFrom(viewAsUser!.dailyData, dateStr) : undefined}
                  />
                </div>
              </div>
            )}


            {/* Daily challenge */}
            {showDaily && (
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Calendar size={13} className="text-primary" />
                  <h2 className="font-display text-sm font-semibold text-foreground">Daily Challenge</h2>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Completed", val: String(dailyCompleted) },
                    { label: "Streak",    val: String(dailyStreak.current) },
                    { label: "Best",      val: String(dailyStreak.longest) },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="font-mono text-xl font-bold text-foreground">{val}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-3">
                  <Button asChild variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                    <Link to="/daily">Today's challenge <ArrowRight size={12} /></Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Endless stats */}
            {showEndless && (
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                  <Infinity size={13} className="text-primary" />
                  <h2 className="font-display text-sm font-semibold text-foreground">Endless Mode</h2>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "Sessions",     val: String(endlessSummary.totalSessions) },
                    { label: "Total Solved", val: String(endlessSummary.totalSolved) },
                    { label: "Best Session", val: String(endlessSummary.bestSessionSolved) },
                    { label: "Fastest",      val: endlessSummary.fastestEver !== null ? formatTime(endlessSummary.fastestEver) : "—" },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="font-mono text-xl font-bold text-foreground">{val}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          {/* ── end RIGHT COLUMN ── */}

        </div>
          </TabsContent>

          <TabsContent value="social" className="mt-0">
            <SocialTab myRating={null} />
          </TabsContent>

        </Tabs>
      </div>

      {!isViewAs && <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />}
    </Layout>
  );
};

export default Stats;
