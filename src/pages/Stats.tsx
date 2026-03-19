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
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";

type ViewFilter = null | "daily" | "endless";

const RECENT_COLLAPSED_COUNT = 5;

const Stats = () => {
  const stats = useMemo(() => getProgressStats(), []);
  const dailyStreak = useMemo(() => getDailyStreak(), []);
  const dailyCompleted = useMemo(() => getTotalDailyCompleted(), []);
  const endlessStats = useMemo(() => getEndlessStats(), []);

  const [viewFilter, setViewFilter] = useState<ViewFilter>(null);
  const [categoryFilter, setCategoryFilter] = useState<PuzzleCategory | null>(null);
  const [recentExpanded, setRecentExpanded] = useState(false);

  const toggleViewFilter = (f: ViewFilter) => {
    setViewFilter((prev) => (prev === f ? null : f));
  };

  const toggleCategoryFilter = (cat: PuzzleCategory) => {
    setCategoryFilter((prev) => (prev === cat ? null : cat));
  };

  const statCards = [
    { icon: Target, label: "Puzzles Solved", value: stats.totalSolved.toString() },
    { icon: Flame, label: "Current Streak", value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}` },
    { icon: Trophy, label: "Longest Streak", value: `${stats.longestStreak} day${stats.longestStreak !== 1 ? "s" : ""}` },
    { icon: Clock, label: "Avg Solve Time", value: stats.totalSolved > 0 ? formatTime(stats.averageTime) : "—" },
    { icon: BarChart3, label: "Total Time", value: stats.totalSolved > 0 ? formatTime(stats.totalTime) : "—" },
    { icon: Trophy, label: "Fastest Solve", value: stats.bestTime !== null ? formatTime(stats.bestTime) : "—" },
  ];

  const categoryKeys = Object.keys(stats.byCategory) as PuzzleCategory[];

  // Filter recent completions by category
  const filteredCompletions = categoryFilter
    ? stats.recentCompletions.filter((r) => r.category === categoryFilter)
    : stats.recentCompletions;

  const visibleCompletions = recentExpanded
    ? filteredCompletions
    : filteredCompletions.slice(0, RECENT_COLLAPSED_COUNT);

  const showDaily = viewFilter === null || viewFilter === "daily";
  const showEndless = viewFilter === null || viewFilter === "endless";
  const showGeneral = viewFilter === null;

  return (
    <Layout>
      <div className="container py-12">
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
        <p className="text-muted-foreground">Track your solving stats, streaks, and best times.</p>

        {/* Overview cards */}
        {showGeneral && (
          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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

            {/* Recent sessions */}
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

        {/* By Puzzle Type — selectable filters, no navigation */}
        {showGeneral && categoryKeys.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">By Puzzle Type</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categoryKeys.map((cat) => {
                const info = CATEGORY_INFO[cat];
                const data = stats.byCategory[cat];
                const isActive = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoryFilter(cat)}
                    className={cn(
                      "group rounded-xl border bg-card p-4 transition-colors text-left w-full",
                      isActive
                        ? "border-primary ring-1 ring-primary/30"
                        : "hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{info?.icon}</span>
                      <span className={cn(
                        "font-display text-sm font-semibold transition-colors",
                        isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                      )}>
                        {info?.name || cat}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">{data.solved}</p>
                        <p className="text-[10px] text-muted-foreground">Solved</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">
                          {formatTime(data.bestTime)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Best</p>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold text-foreground">
                          {formatTime(Math.round(data.totalTime / data.solved))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Avg</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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
                const active = stats.solvedDates.includes(dateStr);
                const isToday = i === 29;
                return (
                  <div
                    key={dateStr}
                    title={`${dateStr}${active ? " ✓" : ""}`}
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-md border text-[9px] flex items-center justify-center font-medium transition-colors",
                      active
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-card border-border text-muted-foreground/50",
                      isToday && "ring-1 ring-primary/50"
                    )}
                  >
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent completions */}
        {showGeneral && filteredCompletions.length > 0 && (
          <div className="mt-12">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Recent Solves
              {categoryFilter && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {CATEGORY_INFO[categoryFilter]?.name}
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
