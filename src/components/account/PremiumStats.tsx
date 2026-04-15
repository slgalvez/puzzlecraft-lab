/**
 * Puzzlecraft+ Advanced Stats — premium-only sections.
 * Hero → Milestones → Accuracy → Personal Bests → Average Performance → Solve History
 */
import { useMemo, useState, useCallback } from "react";
import { getSolveRecords, getSolveSummary, getAllSolveRecordsIncludingDemo, getDemoSolveSummary, type SolveRecord } from "@/lib/solveTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  computeSolveScore,
  computePlayerRating,
  getSkillTier,
  getTierColor,
  getTierProgress,
  getTierCardStyle,
  getTierBadgeStyle,
  trueMistakes,
  type SkillTier,
} from "@/lib/solveScoring";
import { getBestInsight } from "@/lib/solveInsights";
import { getAllMilestones, getUncelebratedIds, markCelebrated, type MilestoneIcon, type MilestoneState } from "@/lib/milestones";
import { Clock, Trophy, Target, BarChart3, Zap, CheckCircle, FlaskConical, Trash2, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp, Award, Puzzle, Flame, Crown, Medal, Bolt, Star, Gauge, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDemoSolves, clearDemoSolves, hasDemoData, generateDemoLeaderboard, clearDemoLeaderboard, hasDemoLeaderboard } from "@/lib/demoStats";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MIN_SOLVES_FOR_AVG = 2;
const HISTORY_PREVIEW = 5;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

// ── Trend helpers ──
function computeTrend(records: SolveRecord[], getValue: (r: SolveRecord) => number): { direction: "up" | "down" | "flat"; pct: number } {
  if (records.length < 6) return { direction: "flat", pct: 0 };
  const half = Math.floor(records.length / 2);
  const recent = records.slice(0, half);
  const older = records.slice(half);
  const recentAvg = recent.reduce((s, r) => s + getValue(r), 0) / recent.length;
  const olderAvg = older.reduce((s, r) => s + getValue(r), 0) / older.length;
  const diff = recentAvg - olderAvg;
  const pct = olderAvg !== 0 ? Math.round(Math.abs(diff / olderAvg) * 100) : 0;
  const threshold = olderAvg * 0.05;
  if (Math.abs(diff) < threshold) return { direction: "flat", pct };
  return { direction: diff > 0 ? "up" : "down", pct };
}

function TrendBadge({ trend, invertColor, label }: { trend: { direction: "up" | "down" | "flat"; pct: number }; invertColor?: boolean; label?: string }) {
  if (trend.direction === "flat") return null;
  const isGood = invertColor ? trend.direction === "down" : trend.direction === "up";
  const pctStr = trend.pct > 0 ? `${trend.pct}%` : "";
  const tooltipText = label
    ? `${label}${pctStr ? ` (${pctStr} ${trend.direction === "up" ? "increase" : "decrease"})` : ""}`
    : (isGood ? `${pctStr} improvement vs. earlier solves` : `${pctStr} decline vs. earlier solves`);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-medium ml-1 p-1 -m-1 min-w-[28px] min-h-[28px] justify-center touch-manipulation",
          isGood ? "text-primary" : "text-destructive"
        )}>
          {trend.direction === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {pctStr && <span>{pctStr}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MILESTONE_ICONS: Record<MilestoneIcon, any> = {
  puzzle: Puzzle,
  flame: Flame,
  trophy: Trophy,
  medal: Medal,
  zap: Zap,
  crown: Crown,
  target: Target,
  award: Award,
  bolt: Bolt,
};

export default function PremiumStats({ onDataChange, hideAdminControls = false, overrideSolveRecords }: { onDataChange?: () => void; hideAdminControls?: boolean; overrideSolveRecords?: SolveRecord[] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { account } = useUserAccount();
  const isAdmin = account?.isAdmin ?? false;
  const hasOverride = overrideSolveRecords != null;
  const demoActive = useMemo(() => hasOverride ? false : hasDemoData(), [refreshKey, hasOverride]);
  const records = useMemo(() => {
    if (hasOverride) return overrideSolveRecords;
    return (isAdmin && demoActive) ? getAllSolveRecordsIncludingDemo() : getSolveRecords();
  }, [refreshKey, isAdmin, demoActive, hasOverride, overrideSolveRecords]);
  const summary = useMemo(() => {
    if (hasOverride) {
      if (overrideSolveRecords.length === 0) return null;
      const totalTime = overrideSolveRecords.reduce((s, r) => s + r.solveTime, 0);
      const bestTime = Math.min(...overrideSolveRecords.map((r) => r.solveTime));
      const avgMistakes = overrideSolveRecords.reduce((s, r) => s + r.mistakesCount, 0) / overrideSolveRecords.length;
      const avgHints = overrideSolveRecords.reduce((s, r) => s + r.hintsUsed, 0) / overrideSolveRecords.length;
      const byType: Record<string, { count: number; bestTime: number; totalTime: number }> = {};
      for (const r of overrideSolveRecords) {
        if (!byType[r.puzzleType]) byType[r.puzzleType] = { count: 0, bestTime: Infinity, totalTime: 0 };
        const e = byType[r.puzzleType]; e.count++; e.totalTime += r.solveTime; e.bestTime = Math.min(e.bestTime, r.solveTime);
      }
      return {
        totalSolved: overrideSolveRecords.length,
        unassistedCount: overrideSolveRecords.filter((r) => !r.assisted).length,
        totalTime, averageTime: Math.round(totalTime / overrideSolveRecords.length), bestTime,
        averageMistakes: Math.round(avgMistakes * 10) / 10, averageHints: Math.round(avgHints * 10) / 10,
        byType, dailyChallengeCount: overrideSolveRecords.filter((r) => r.isDailyChallenge).length,
      };
    }
    return (isAdmin && demoActive) ? getDemoSolveSummary() : getSolveSummary();
  }, [refreshKey, isAdmin, demoActive, hasOverride, overrideSolveRecords]);
  const demoLeaderboardActive = useMemo(() => hasDemoLeaderboard(), [refreshKey]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const handleGenerate = useCallback(() => {
    generateDemoSolves(25);
    setRefreshKey((k) => k + 1);
    onDataChange?.();
  }, [onDataChange]);

  const handleClear = useCallback(() => {
    clearDemoSolves();
    setRefreshKey((k) => k + 1);
    onDataChange?.();
  }, [onDataChange]);

  const handleGenerateLeaderboard = useCallback(async () => {
    await generateDemoLeaderboard();
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClearLeaderboard = useCallback(async () => {
    await clearDemoLeaderboard();
    setRefreshKey((k) => k + 1);
  }, []);

  const adminControls = isAdmin && !hideAdminControls && (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
      <FlaskConical size={14} className="text-primary" />
      <span className="text-xs font-medium text-primary">Admin</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerate}>
        Generate Stats Demo
      </Button>
      {demoActive && (
        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleClear}>
          <Trash2 size={12} className="mr-1" /> Clear Stats
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerateLeaderboard}>
        Generate Leaderboard Demo
      </Button>
      {demoLeaderboardActive && (
        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleClearLeaderboard}>
          <Trash2 size={12} className="mr-1" /> Clear Leaderboard
        </Button>
      )}
    </div>
  );

  if (!summary || records.length === 0) {
    return (
      <div className="space-y-3">
        {adminControls}
        <div className="rounded-xl border border-primary/20 bg-card p-6 text-center">
          <Target className="mx-auto h-6 w-6 text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            Complete some puzzles to unlock advanced analytics.
          </p>
        </div>
      </div>
    );
  }

  // ── Scoring / Rating ──
  const playerRating = computePlayerRating(records);
  const skillTier = getSkillTier(playerRating);
  const tierProgress = getTierProgress(playerRating);
  const tierColor = getTierColor(skillTier);
  const scoreTrend = computeTrend(records, (r) => computeSolveScore(r));
  const timeTrend = computeTrend(records, (r) => r.solveTime);
  const accuracyTrend = computeTrend(records, (r) => trueMistakes(r));

  const insight = getBestInsight(records);

  const noHintSolves = records.filter((r) => r.hintsUsed === 0 && !r.assisted);
  const noHintRate = Math.round((noHintSolves.length / records.length) * 100);

  const totalTrueMistakes = records.reduce((s, r) => s + trueMistakes(r), 0);
  const avgMistakes = Math.round((totalTrueMistakes / records.length) * 10) / 10;
  const noHintPercent = Math.round((noHintSolves.length / records.length) * 100);
  const unassistedPercent = Math.round((summary.unassistedCount / records.length) * 100);

  const accuracyInsight = avgMistakes < 1
    ? "You're solving with impressive precision."
    : avgMistakes < 2
      ? "Solid accuracy — room to tighten up on harder puzzles."
      : "Try slowing down on tricky sections to reduce mistakes.";

  const bestByType: { type: PuzzleCategory; time: number; difficulty: string; score: number }[] = [];
  const avgByType: { type: PuzzleCategory; avg: number; count: number; avgScore: number }[] = [];

  for (const cat of ALL_CATEGORIES) {
    const catRecords = records.filter((r) => r.puzzleType === cat);
    if (catRecords.length === 0) continue;
    const best = catRecords.reduce((a, b) => (a.solveTime < b.solveTime ? a : b));
    bestByType.push({ type: cat, time: best.solveTime, difficulty: best.difficulty, score: computeSolveScore(best) });
    if (catRecords.length >= MIN_SOLVES_FOR_AVG) {
      const total = catRecords.reduce((s, r) => s + r.solveTime, 0);
      const totalScore = catRecords.reduce((s, r) => s + computeSolveScore(r), 0);
      avgByType.push({ type: cat, avg: Math.round(total / catRecords.length), count: catRecords.length, avgScore: Math.round(totalScore / catRecords.length) });
    }
  }

  const bestInsight = bestByType.length >= 3
    ? `You've set personal bests across ${bestByType.length} puzzle types.`
    : "Keep solving to set more personal records.";

  const avgInsight = avgByType.length > 0
    ? `Your consistency is ${timeTrend.direction === "down" ? "improving" : timeTrend.direction === "up" ? "worth watching" : "holding steady"} over recent solves.`
    : "Play more to track your average performance.";

  const recent20 = records.slice(0, 20);
  const historyVisible = historyExpanded ? recent20 : recent20.slice(0, HISTORY_PREVIEW);

  // Precompute best times and recent averages for badges
  const bestTimeByType: Record<string, number> = {};
  const recentAvgByType: Record<string, number> = {};
  for (const cat of ALL_CATEGORIES) {
    const catRecords = records.filter((r) => r.puzzleType === cat);
    if (catRecords.length > 0) {
      bestTimeByType[cat] = Math.min(...catRecords.map((r) => r.solveTime));
      const recentSlice = catRecords.slice(0, 10);
      recentAvgByType[cat] = recentSlice.reduce((s, r) => s + r.solveTime, 0) / recentSlice.length;
    }
  }

  function getSolveBadges(r: SolveRecord): { icon: typeof Star; label: string }[] {
    const badges: { icon: typeof Star; label: string }[] = [];
    if (bestTimeByType[r.puzzleType] === r.solveTime) {
      badges.push({ icon: Trophy, label: "Personal Best" });
    }
    if (r.difficulty === "extreme" || r.difficulty === "insane") {
      badges.push({ icon: Gauge, label: "High Difficulty" });
    }
    if (r.hintsUsed === 0 && trueMistakes(r) === 0 && !r.assisted) {
      badges.push({ icon: Sparkles, label: "Clean Solve" });
    }
    if (recentAvgByType[r.puzzleType] && r.solveTime < recentAvgByType[r.puzzleType] * 0.9) {
      badges.push({ icon: TrendingUp, label: "Faster than average" });
    }
    return badges.slice(0, 2);
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {adminControls}
        {demoActive && (
          <p className="text-xs text-primary/60 italic">
            Viewing demo data — not from real solves
          </p>
        )}

        {/* ── MILESTONES ── */}
        {(() => {
          const milestones = getAllMilestones(records);
          const achievedCount = milestones.filter((m) => m.state === "achieved").length;
          if (achievedCount === 0 && records.length < 5) return null;

          const uncelebrated = getUncelebratedIds();
          const newlyAchieved = milestones
            .filter((m) => m.state === "achieved" && uncelebrated.has(m.id))
            .map((m) => m.id);

          if (newlyAchieved.length > 0) {
            setTimeout(() => markCelebrated(newlyAchieved), 2000);
          }

          return (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Award size={15} className="text-primary" />
                Milestones
                <span className="text-xs text-muted-foreground font-normal">{achievedCount}/{milestones.length}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {milestones.map((m) => {
                  const IconComp = MILESTONE_ICONS[m.icon] ?? Target;
                  const isAchieved = m.state === "achieved";
                  const isInProgress = m.state === "in-progress";
                  const isLocked = m.state === "locked";
                  const progressPercent = Math.round((m.current / m.target) * 100);
                  const isCelebrating = isAchieved && uncelebrated.has(m.id);

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all relative",
                        isAchieved && "bg-primary/5 border-primary/25",
                        isInProgress && "bg-card border-border",
                        isLocked && "opacity-40",
                        isCelebrating && "animate-milestone-glow"
                      )}
                    >
                      {isCelebrating && (
                        <>
                          <span className="absolute top-1 right-1 text-primary animate-milestone-sparkle" style={{ animationDelay: "0.1s" }}>✦</span>
                          <span className="absolute bottom-1 left-2 text-primary/60 animate-milestone-sparkle text-[10px]" style={{ animationDelay: "0.3s" }}>✦</span>
                          <span className="absolute top-2 left-1 text-primary/40 animate-milestone-sparkle text-[8px]" style={{ animationDelay: "0.5s" }}>✦</span>
                        </>
                      )}
                      <div className="flex items-start gap-2.5">
                        <IconComp
                          size={18}
                          className={cn(
                            "shrink-0 mt-0.5",
                            isAchieved ? "text-primary" : "text-muted-foreground",
                            isCelebrating && "animate-milestone-sparkle"
                          )}
                          style={isCelebrating ? { animationDelay: "0.2s" } : undefined}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={cn(
                              "text-xs leading-tight",
                              isAchieved ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>{m.label}</p>
                            {m.isNext && !isAchieved && (
                              <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold text-primary uppercase tracking-wider">
                                Next
                              </span>
                            )}
                          </div>
                          {isInProgress && (
                            <div className="mt-1.5 space-y-1">
                              <Progress value={progressPercent} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground">{m.progressText}</p>
                            </div>
                          )}
                          {isAchieved && (
                            <p className="text-[10px] text-primary/70 mt-0.5">Achieved</p>
                          )}
                          {isLocked && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Upcoming</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── ACCURACY INSIGHTS (compact) ── */}
        <div className="border-b border-border/40 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle size={15} className="text-primary" />
            Accuracy
            <TrendBadge trend={accuracyTrend} invertColor label="Accuracy trend vs. recent solves" />
          </h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{avgMistakes}</p>
              <p className="text-[10px] text-muted-foreground">Avg Mistakes</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{noHintPercent}%</p>
              <p className="text-[10px] text-muted-foreground">No Hints</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{unassistedPercent}%</p>
              <p className="text-[10px] text-muted-foreground">Unassisted</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-foreground">
                {Math.round((summary.averageHints ?? 0) * 10) / 10}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Hints</p>
            </div>
          </div>
        </div>

        {/* ── PERFORMANCE BY PUZZLE TYPE (merged bests + averages) ── */}
        {bestByType.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              Performance by Puzzle Type
              <TrendBadge trend={timeTrend} invertColor label="Speed trend vs. recent solves" />
            </h3>
            <div className="divide-y divide-border/40">
              {bestByType.map(({ type, time, difficulty, score }) => {
                const avgEntry = avgByType.find((a) => a.type === type);
                return (
                  <div key={type} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{CATEGORY_INFO[type]?.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                        Best on {DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS] ?? difficulty} · {score} pts
                      </p>
                    </div>
                    <div className="text-right shrink-0 grid grid-cols-3 gap-3 text-center min-w-[180px]">
                      <div>
                        <p className="font-mono text-sm font-bold text-primary">{formatTime(time)}</p>
                        <p className="text-[9px] text-muted-foreground">Best</p>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-foreground">{avgEntry ? formatTime(avgEntry.avg) : "—"}</p>
                        <p className="text-[9px] text-muted-foreground">Avg</p>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold text-foreground">{avgEntry?.count ?? 1}</p>
                        <p className="text-[9px] text-muted-foreground">Solves</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SOLVE HISTORY — collapsible table ── */}
        <div className="rounded-xl border bg-card p-5">
          <button
            type="button"
            onClick={() => setHistoryExpanded((p) => !p)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              Solve History
              <span className="text-xs text-muted-foreground font-normal">Last 20</span>
            </h3>
            {historyExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Difficulty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Score</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-16"></th>
                </tr>
              </thead>
              <tbody>
                {historyVisible.map((r) => {
                  const info = CATEGORY_INFO[r.puzzleType];
                  const score = computeSolveScore(r);
                  const badges = getSolveBadges(r);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
                        {info?.name ?? r.puzzleType}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{formatTime(r.solveTime)}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground hidden sm:table-cell">
                        {DIFFICULTY_LABELS[r.difficulty as keyof typeof DIFFICULTY_LABELS] ?? r.difficulty}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground hidden sm:table-cell">
                        {score}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {new Date(r.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {badges.map((b, i) => (
                            <Tooltip key={i}>
                              <TooltipTrigger asChild>
                                <button type="button" className="p-1 -m-0.5 min-w-[28px] min-h-[28px] flex items-center justify-center touch-manipulation">
                                  <b.icon size={13} className="text-primary/70" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {b.label}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {recent20.length > HISTORY_PREVIEW && !historyExpanded && (
            <button
              type="button"
              onClick={() => setHistoryExpanded(true)}
              className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Show all {recent20.length} solves
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
