import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { getProgressStats } from "@/lib/progressTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { getDailyStreak, getTotalDailyCompleted } from "@/lib/dailyChallenge";
import { getEndlessStats } from "@/lib/endlessHistory";
import { Trophy, Flame, Clock, Target, BarChart3, Calendar, Infinity, ArrowRight, TrendingUp, TrendingDown, Shield, Zap, Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PremiumStats from "@/components/account/PremiumStats";
import { StatsPremiumPreview } from "@/components/account/PremiumPreview";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUserAccount } from "@/contexts/UserAccountContext";
import UpgradeModal from "@/components/account/UpgradeModal";
import { hasPremiumAccess, shouldShowUpgradeCTA } from "@/lib/premiumAccess";
import { syncLeaderboardRating } from "@/lib/leaderboardSync";
import { checkMilestones } from "@/lib/milestones";
import { getSolveRecords } from "@/lib/solveTracker";
import { computePlayerRating, getSkillTier, getTierColor, getTierProgress } from "@/lib/solveScoring";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ViewFilter = null | "daily" | "endless";

const RECENT_COLLAPSED_COUNT = 5;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const Stats = () => {
  const [dataVersion, setDataVersion] = useState(0);
  const stats = useMemo(() => getProgressStats(), [dataVersion]);
  const dailyStreak = useMemo(() => getDailyStreak(), [dataVersion]);
  const dailyCompleted = useMemo(() => getTotalDailyCompleted(), [dataVersion]);
  const endlessStats = useMemo(() => getEndlessStats(), [dataVersion]);
  const { account, subscribed } = useUserAccount();
  const isAdmin = account?.isAdmin ?? false;
  const premiumAccess = hasPremiumAccess({ isAdmin, subscribed });
  const showUpgrade = shouldShowUpgradeCTA({ isAdmin, subscribed });
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Local rating for Your Rank card (premium only)
  const localRating = useMemo(() => {
    if (!premiumAccess) return null;
    const recs = getSolveRecords().filter((r) => r.solveTime >= 10);
    if (recs.length < 10) return null;
    const rating = computePlayerRating(recs);
    const tier = getSkillTier(rating);
    let bestRating = rating;
    const WINDOW = 25;
    for (let i = 1; i <= Math.max(0, recs.length - 10); i++) {
      const windowRecs = recs.slice(i);
      const r = computePlayerRating(windowRecs);
      if (r > bestRating) bestRating = r;
    }
    return { rating, tier, solveCount: recs.length, bestRating };
  }, [dataVersion, premiumAccess]);

  // Fetch user's leaderboard entry for rank position and rating change (premium only)
  const { data: myLeaderboardEntry } = useQuery({
    queryKey: ["my-leaderboard-entry", account?.id, dataVersion],
    queryFn: async () => {
      if (!account) return null;
      const { data: entry } = await supabase
        .from("leaderboard_entries")
        .select("rating, previous_rating, skill_tier, solve_count")
        .eq("user_id", account.id)
        .maybeSingle();
      if (!entry) return null;
      const { count } = await supabase
        .from("leaderboard_entries")
        .select("*", { count: "exact", head: true })
        .gt("rating", entry.rating);
      return { ...entry, rank: (count ?? 0) + 1 };
    },
    enabled: !!account && premiumAccess,
    staleTime: 30_000,
  });

  const TIER_THRESHOLDS: Record<string, number> = {
    Expert: 1200, Advanced: 950, Skilled: 700, Casual: 400, Beginner: 0,
  };
  const TIER_ORDER_LIST = ["Beginner", "Casual", "Skilled", "Advanced", "Expert"];
  const nextTierInfo = localRating ? (() => {
    const idx = TIER_ORDER_LIST.indexOf(localRating.tier);
    if (idx >= TIER_ORDER_LIST.length - 1) return null;
    const next = TIER_ORDER_LIST[idx + 1];
    return { name: next, threshold: TIER_THRESHOLDS[next] };
  })() : null;

  // Sync rating to leaderboard + check milestones on load
  useEffect(() => {
    if (account) {
      syncLeaderboardRating(account.id, account.displayName);
    }
    checkMilestones();
  }, [account, dataVersion]);

  const [viewFilter, setViewFilter] = useState<ViewFilter>(null);
  const [categoryFilter, setCategoryFilter] = useState<PuzzleCategory | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [recentExpanded, setRecentExpanded] = useState(false);

  const toggleViewFilter = (f: ViewFilter) => {
    setViewFilter((prev) => (prev === f ? null : f));
  };

  const toggleDateFilter = (dateStr: string) => {
    setDateFilter((prev) => (prev === dateStr ? null : dateStr));
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value === "all" ? null : (value as PuzzleCategory));
  };

  const filteredCompletions = useMemo(() => {
    let results = stats.recentCompletions;
    if (categoryFilter) {
      results = results.filter((r) => r.category === categoryFilter);
    }
    if (dateFilter) {
      results = results.filter((r) => r.date.slice(0, 10) === dateFilter);
    }
    return results;
  }, [stats.recentCompletions, categoryFilter, dateFilter]);

  const filteredStatCards = useMemo(() => {
    if (!dateFilter) return null;
    const dayCompletions = stats.recentCompletions.filter(
      (r) => r.date.slice(0, 10) === dateFilter
    );
    const catFiltered = categoryFilter
      ? dayCompletions.filter((r) => r.category === categoryFilter)
      : dayCompletions;
    const totalSolved = catFiltered.length;
    const totalTime = catFiltered.reduce((s, r) => s + r.time, 0);
    const bestTime = catFiltered.length > 0 ? Math.min(...catFiltered.map((r) => r.time)) : null;
    return {
      totalSolved,
      totalTime,
      averageTime: totalSolved > 0 ? Math.round(totalTime / totalSolved) : 0,
      bestTime,
    };
  }, [dateFilter, categoryFilter, stats.recentCompletions]);

  const visibleCompletions = recentExpanded
    ? filteredCompletions
    : filteredCompletions.slice(0, RECENT_COLLAPSED_COUNT);

  const showDaily = viewFilter === null || viewFilter === "daily";
  const showEndless = viewFilter === null || viewFilter === "endless";
  const showGeneral = viewFilter === null;

  const displayStats = filteredStatCards ?? stats;

  const statCards = [
    { icon: Target, label: "Puzzles Solved", value: displayStats.totalSolved.toString() },
    ...(!dateFilter ? [
      { icon: Flame, label: "Current Streak", value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}` },
    ] : []),
    { icon: Clock, label: "Avg Solve Time", value: displayStats.totalSolved > 0 ? formatTime(displayStats.averageTime) : "—" },
    { icon: Trophy, label: "Fastest Solve", value: displayStats.bestTime !== null ? formatTime(displayStats.bestTime) : "—" },
  ];

  const lifetimeCards = !dateFilter ? [
    { icon: Flame, label: "Longest Streak", value: `${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}` },
    { icon: BarChart3, label: "Total Time", value: stats.totalSolved > 0 ? formatTime(stats.totalTime) : "—" },
  ] : [];

  const activeFilterLabel = [
    dateFilter && new Date(dateFilter + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    categoryFilter && CATEGORY_INFO[categoryFilter]?.name,
  ].filter(Boolean).join(" · ");

  return (
    <Layout>
      <div className="container py-6 md:py-12">
        <div className="mb-2">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Your Progress</h1>
        </div>
        <p className="text-muted-foreground">
          Track your solving stats, streaks, and best times.
          {activeFilterLabel && (
            <span className="ml-2 text-sm font-medium text-primary">
              Showing: {activeFilterLabel}
            </span>
          )}
        </p>

        {/* Your Rank Card — premium users only */}
        {showGeneral && premiumAccess && localRating && (
          <div className={cn(
            "mt-6 rounded-2xl border bg-card p-5 transition-all",
            nextTierInfo && localRating.rating >= nextTierInfo.threshold * 0.88
              ? "border-primary/30"
              : "border-primary/20"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Rank</span>
                  {myLeaderboardEntry && (
                    <span className="font-mono font-bold text-sm text-primary">
                      #{myLeaderboardEntry.rank}
                    </span>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-default">
                          <Info size={13} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-52 text-xs leading-relaxed">
                        <p className="font-medium mb-1">Your rating is based on:</p>
                        <ul className="space-y-0.5 text-muted-foreground">
                          <li>• Puzzle difficulty</li>
                          <li>• Solve speed</li>
                          <li>• Accuracy</li>
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
                  {myLeaderboardEntry && myLeaderboardEntry.previous_rating > 0 && (
                    (() => {
                      const diff = myLeaderboardEntry.rating - myLeaderboardEntry.previous_rating;
                      if (diff === 0) return null;
                      return (
                        <span className={cn("text-xs font-semibold inline-flex items-center gap-0.5", diff > 0 ? "text-emerald-500" : "text-destructive")}>
                          {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      );
                    })()
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Based on your recent solves</p>
                {localRating.bestRating > localRating.rating && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Best: {localRating.bestRating}
                  </p>
                )}
                {nextTierInfo && (() => {
                  const pointsNeeded = nextTierInfo.threshold - localRating.rating;
                  const nearRank = pointsNeeded <= Math.round(nextTierInfo.threshold * 0.12);
                  return (
                    <div className="mt-3 max-w-56">
                      <Progress
                        value={getTierProgress(localRating.rating)}
                        className={cn(
                          "h-2 group cursor-default transition-all",
                          "[&:hover_.h-full]:shadow-[0_0_8px_hsl(var(--primary)/0.5)] [&:active_.h-full]:shadow-[0_0_8px_hsl(var(--primary)/0.5)]",
                          nearRank && "h-2.5"
                        )}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {nearRank
                          ? `Only ${pointsNeeded} points to ${nextTierInfo.name}`
                          : `${pointsNeeded} points to ${nextTierInfo.name}`
                        }
                      </p>
                      <p className="text-[9px] text-muted-foreground/60">
                        {localRating.rating} / {nextTierInfo.threshold}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <Button asChild variant="outline" size="sm" className="self-start">
                <Link to="/leaderboard"><Shield size={14} /> View Leaderboard</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Overview cards */}
        {showGeneral && (
          <div className={cn(
            "mt-8 grid gap-4 grid-cols-2",
            !dateFilter ? "sm:grid-cols-4" : "sm:grid-cols-3"
          )}>
            {statCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border bg-card p-4 text-center">
                <Icon className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="font-mono text-xl font-bold text-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Daily challenge stats */}
        {showDaily && dailyCompleted > 0 && (
          <div className="mt-8 rounded-xl border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Daily Challenge
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{dailyCompleted}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{dailyStreak.current}</p>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{dailyStreak.longest}</p>
                <p className="text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </div>
        )}

        {/* Endless Mode sessions */}
        {showEndless && endlessStats && (
          <div className="mt-8 rounded-xl border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Infinity size={18} className="text-primary" />
              Endless Mode
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-5">
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{endlessStats.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{endlessStats.totalSolved}</p>
                <p className="text-xs text-muted-foreground">Total Solved</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">{endlessStats.bestSessionSolved}</p>
                <p className="text-xs text-muted-foreground">Best Session</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-foreground">
                  {endlessStats.fastestEver !== null ? formatTime(endlessStats.fastestEver) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Fastest Solve</p>
              </div>
            </div>

            {endlessStats.recentSessions.length > 0 && (
              <TooltipProvider>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Recent Sessions</h3>
                <div className="space-y-2">
                  {endlessStats.recentSessions.map((session) => {
                    const typesUnique = [...new Set(session.typesPlayed)];
                    const ups = session.solves.filter((s) => s.diffChange === "up").length;
                    const downs = session.solves.filter((s) => s.diffChange === "down").length;
                    return (
                      <div key={session.id} className="rounded-lg border bg-secondary/30 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {session.totalSolved} solved · {formatTime(session.totalTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-0 flex-wrap min-w-0">
                            {typesUnique.map((t, idx) => (
                              <span key={t} className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                {idx > 0 && <span className="text-muted-foreground/40 mx-1">|</span>}
                                <span className="text-muted-foreground">{CATEGORY_INFO[t]?.name}</span>
                                <span className="text-muted-foreground/60 text-[10px] ml-0.5">
                                  ({DIFFICULTY_LABELS[session.finalDifficulties[t] ?? "medium"]})
                                </span>
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ups > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-0.5 text-[10px] text-primary cursor-default">
                                    <TrendingUp size={9} /> {ups}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Faster than your average</TooltipContent>
                              </Tooltip>
                            )}
                            {downs > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-0.5 text-[10px] text-destructive cursor-default">
                                    <TrendingDown size={9} /> {downs}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">Slower than your average</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* By Puzzle Type — dropdown selector */}
        {showGeneral && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">By Puzzle Type</h2>
            <Select
              value={categoryFilter ?? "all"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All Puzzle Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Puzzle Types</SelectItem>
                {ALL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_INFO[cat]?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Show category stats card when a type is selected */}
            {categoryFilter && stats.byCategory[categoryFilter] && (
               <div className="mt-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-display text-sm font-semibold text-primary">
                    {CATEGORY_INFO[categoryFilter]?.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">{stats.byCategory[categoryFilter].solved}</p>
                    <p className="text-[10px] text-muted-foreground">Solved</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {formatTime(stats.byCategory[categoryFilter].bestTime)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Best</p>
                  </div>
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {formatTime(Math.round(stats.byCategory[categoryFilter].totalTime / stats.byCategory[categoryFilter].solved))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Avg</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity calendar (last 30 days) */}
        {showGeneral && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              <Calendar className="inline h-5 w-5 mr-2 text-primary" />
              Last 30 Days
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const dateStr = d.toISOString().slice(0, 10);
                const hasActivity = stats.solvedDates.includes(dateStr);
                const isToday = i === 29;
                const isSelected = dateFilter === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => toggleDateFilter(dateStr)}
                    title={`${dateStr}${hasActivity ? " ✓" : ""}`}
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-md border text-[9px] flex items-center justify-center font-medium transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/40"
                        : hasActivity
                          ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30"
                          : "bg-card border-border text-muted-foreground/50 hover:border-muted-foreground/30",
                      isToday && !isSelected && "ring-1 ring-primary/50"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter(null)}
                className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Clear date filter
              </button>
            )}
          </div>
        )}

        {/* Lifetime Stats */}
        {showGeneral && lifetimeCards.length > 0 && stats.totalSolved > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Lifetime</h2>
            <div className="grid grid-cols-2 gap-4">
              {lifetimeCards.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border bg-card p-4 text-center">
                  <Icon className="mx-auto h-4 w-4 text-muted-foreground mb-2" />
                  <p className="font-mono text-lg font-bold text-foreground">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalSolved === 0 && (
          <div className="mt-16 text-center">
            <p className="text-lg text-muted-foreground">No puzzles solved yet!</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button asChild>
                <Link to="/daily">
                  Start with Today's Challenge <ArrowRight size={14} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/quick-play/sudoku?mode=endless">Try Endless Mode</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Premium section — full analytics */}
        {showGeneral && premiumAccess && (
          <div className="mt-12">
            <PremiumStats onDataChange={() => setDataVersion((v) => v + 1)} />
          </div>
        )}

        {/* Premium preview for free users — blurred teaser */}
        {showGeneral && !premiumAccess && showUpgrade && stats.totalSolved > 0 && (
          <StatsPremiumPreview onUpgrade={() => setUpgradeOpen(true)} />
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Layout>
  );
};

export default Stats;
