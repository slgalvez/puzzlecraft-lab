import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { getProgressStats } from "@/lib/progressTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { getDailyStreak, getTotalDailyCompleted } from "@/lib/dailyChallenge";
import { getEndlessStats } from "@/lib/endlessHistory";
import { Trophy, Flame, Clock, Target, BarChart3, Calendar, Infinity, ArrowRight, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";

type ViewFilter = null | "daily" | "endless";

const RECENT_COLLAPSED_COUNT = 5;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

const Stats = () => {
  const stats = useMemo(() => getProgressStats(), []);
  const dailyStreak = useMemo(() => getDailyStreak(), []);
  const dailyCompleted = useMemo(() => getTotalDailyCompleted(), []);
  const endlessStats = useMemo(() => getEndlessStats(), []);

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

  // Derive filtered completions based on all active filters
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

  // Derive filtered stat cards when date filter is active
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

  // Stat cards use filtered data when date filter is active
  const displayStats = filteredStatCards ?? stats;
  const statCards = [
    { icon: Target, label: "Puzzles Solved", value: displayStats.totalSolved.toString() },
    ...(!dateFilter ? [
      { icon: Flame, label: "Current Streak", value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}` },
      { icon: Trophy, label: "Longest Streak", value: `${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}` },
    ] : []),
    { icon: Clock, label: "Avg Solve Time", value: displayStats.totalSolved > 0 ? formatTime(displayStats.averageTime) : "—" },
    { icon: BarChart3, label: "Total Time", value: displayStats.totalSolved > 0 ? formatTime(displayStats.totalTime) : "—" },
    { icon: Trophy, label: "Fastest Solve", value: displayStats.bestTime !== null ? formatTime(displayStats.bestTime) : "—" },
  ];

  const activeFilterLabel = [
    dateFilter && new Date(dateFilter + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    categoryFilter && CATEGORY_INFO[categoryFilter]?.name,
  ].filter(Boolean).join(" · ");

  return (
    <Layout>
      <div className="container py-6 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">Your Progress</h1>
          <div className="flex gap-2">
            <Button
              variant={viewFilter === "daily" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleViewFilter("daily")}
            >
              <Calendar size={14} /> Daily
            </Button>
            <Button
              variant={viewFilter === "endless" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleViewFilter("endless")}
            >
              <Infinity size={14} /> Endless
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Track your solving stats, streaks, and best times.
          {activeFilterLabel && (
            <span className="ml-2 text-sm font-medium text-primary">
              Showing: {activeFilterLabel}
            </span>
          )}
        </p>

        {/* Overview cards */}
        {showGeneral && (
          <div className={cn(
            "mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3",
            !dateFilter && "lg:grid-cols-6"
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {typesUnique.map((t) => (
                            <div key={t} className="flex items-center gap-1">
                              <PuzzleIcon type={t} size={12} className="text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">{CATEGORY_INFO[t]?.name}</span>
                              {session.finalDifficulties[t] && session.finalDifficulties[t] !== "medium" && (
                                <span className="text-[10px] font-medium text-foreground capitalize">
                                  {DIFFICULTY_LABELS[session.finalDifficulties[t]!]}
                                </span>
                              )}
                            </div>
                          ))}
                          {ups > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-primary">
                              <TrendingUp size={9} /> {ups}
                            </span>
                          )}
                          {downs > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                              <TrendingDown size={9} /> {downs}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                {ALL_CATEGORIES.map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  return (
                    <SelectItem key={cat} value={cat}>
                      <span className="mr-1.5">{info?.icon}</span>
                      {info?.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Show category stats card when a type is selected */}
            {categoryFilter && stats.byCategory[categoryFilter] && (
              <div className="mt-4 rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CATEGORY_INFO[categoryFilter]?.icon}</span>
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

        {/* Activity calendar (last 30 days) — clickable day cells */}
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

        {/* Recent completions */}
        {showGeneral && filteredCompletions.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Recent Solves
              {(categoryFilter || dateFilter) && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {[
                    categoryFilter && CATEGORY_INFO[categoryFilter]?.name,
                    dateFilter && new Date(dateFilter + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                  ].filter(Boolean).join(", ")}
                </span>
              )}
            </h2>
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCompletions.map((r, i) => {
                    const info = CATEGORY_INFO[r.category as PuzzleCategory];
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2.5 text-foreground">
                          <span className="mr-1.5">{info?.icon}</span>
                          {info?.name || r.category}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.difficulty}</td>
                        <td className="px-4 py-2.5 font-mono font-medium text-foreground">{formatTime(r.time)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {new Date(r.date).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredCompletions.length > RECENT_COLLAPSED_COUNT && (
              <button
                type="button"
                onClick={() => setRecentExpanded((p) => !p)}
                className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mx-auto"
              >
                {recentExpanded ? (
                  <>Show less <ChevronUp size={14} /></>
                ) : (
                  <>See more <ChevronDown size={14} /></>
                )}
              </button>
            )}
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
      </div>
    </Layout>
  );
};

export default Stats;
