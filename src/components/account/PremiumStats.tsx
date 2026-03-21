/**
 * Puzzlecraft+ Advanced Stats — premium-only sections.
 * Hero → Milestones → Accuracy → Personal Bests → Average Performance → Solve History
 */
import { useMemo, useState, useCallback } from "react";
import { getSolveRecords, getSolveSummary, type SolveRecord } from "@/lib/solveTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory, type Difficulty } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import {
  computeSolveScore,
  computePlayerRating,
  getSkillTier,
  getTierColor,
  getTierProgress,
  trueMistakes,
} from "@/lib/solveScoring";
import { getBestInsight } from "@/lib/solveInsights";
import { getAllMilestones, getUncelebratedIds, markCelebrated, type MilestoneIcon, type MilestoneState } from "@/lib/milestones";
import { Clock, Trophy, Target, BarChart3, Zap, CheckCircle, FlaskConical, Trash2, TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp, Award, Puzzle, Flame, Crown, Medal, Bolt, Star, Gauge, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDemoSolves, clearDemoSolves, hasDemoData } from "@/lib/demoStats";
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
function computeTrend(records: SolveRecord[], getValue: (r: SolveRecord) => number): "up" | "down" | "flat" {
  if (records.length < 6) return "flat";
  const half = Math.floor(records.length / 2);
  const recent = records.slice(0, half);
  const older = records.slice(half);
  const recentAvg = recent.reduce((s, r) => s + getValue(r), 0) / recent.length;
  const olderAvg = older.reduce((s, r) => s + getValue(r), 0) / older.length;
  const diff = recentAvg - olderAvg;
  const threshold = olderAvg * 0.05;
  if (Math.abs(diff) < threshold) return "flat";
  return diff > 0 ? "up" : "down";
}

function TrendBadge({ trend, invertColor }: { trend: "up" | "down" | "flat"; invertColor?: boolean }) {
  if (trend === "flat") return null;
  const isGood = invertColor ? trend === "down" : trend === "up";
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-medium ml-1",
      isGood ? "text-primary" : "text-destructive"
    )}>
      {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    </span>
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

export default function PremiumStats({ onDataChange }: { onDataChange?: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { account } = useUserAccount();
  const isAdmin = account?.isAdmin ?? false;
  const records = useMemo(() => getSolveRecords(), [refreshKey]);
  const summary = useMemo(() => getSolveSummary(), [refreshKey]);
  const demoActive = useMemo(() => hasDemoData(), [refreshKey]);
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

  const adminControls = isAdmin && (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
      <FlaskConical size={14} className="text-primary" />
      <span className="text-xs font-medium text-primary">Admin</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerate}>
        Generate Demo Data
      </Button>
      {demoActive && (
        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleClear}>
          <Trash2 size={12} className="mr-1" /> Clear Demo
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

  // Data-driven insight
  const insight = getBestInsight(records);

  // No-hint rate
  const noHintSolves = records.filter((r) => r.hintsUsed === 0 && !r.assisted);
  const noHintRate = Math.round((noHintSolves.length / records.length) * 100);

  // Accuracy
  const totalTrueMistakes = records.reduce((s, r) => s + trueMistakes(r), 0);
  const avgMistakes = Math.round((totalTrueMistakes / records.length) * 10) / 10;
  const noHintPercent = Math.round((noHintSolves.length / records.length) * 100);
  const unassistedPercent = Math.round((summary.unassistedCount / records.length) * 100);

  const accuracyInsight = avgMistakes < 1
    ? "You're solving with impressive precision."
    : avgMistakes < 2
      ? "Solid accuracy — room to tighten up on harder puzzles."
      : "Try slowing down on tricky sections to reduce mistakes.";

  // Personal bests & averages
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
    ? `Your consistency is ${timeTrend === "down" ? "improving" : timeTrend === "up" ? "worth watching" : "holding steady"} over recent solves.`
    : "Play more to track your average performance.";

  // History with performance badges
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
    // Personal Best
    if (bestTimeByType[r.puzzleType] === r.solveTime) {
      badges.push({ icon: Trophy, label: "Personal Best" });
    }
    // High Difficulty
    if (r.difficulty === "extreme" || r.difficulty === "insane") {
      badges.push({ icon: Gauge, label: "High Difficulty" });
    }
    // Clean Solve
    if (r.hintsUsed === 0 && trueMistakes(r) === 0 && !r.assisted) {
      badges.push({ icon: Sparkles, label: "Clean Solve" });
    }
    // Improvement (faster than recent avg)
    if (recentAvgByType[r.puzzleType] && r.solveTime < recentAvgByType[r.puzzleType] * 0.9) {
      badges.push({ icon: TrendingUp, label: "Faster than average" });
    }
    return badges.slice(0, 2); // max 2
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {adminControls}
        {demoActive && (
          <p className="text-xs text-primary/60 italic">
            Viewing demo data — not from real solves
          </p>
        )}

        {/* ── HEADER ── */}
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Advanced Analytics
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Puzzlecraft+
          </span>
        </div>

        {/* ── HERO SECTION ── */}
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Rating block */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Zap size={18} className="text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Player Rating</span>
              </div>
              <p className="font-mono text-5xl font-bold text-foreground leading-none">
                {playerRating}
                <TrendBadge trend={scoreTrend} />
              </p>
              <p className={cn("mt-2 text-sm font-semibold", tierColor)}>{skillTier}</p>
              <div className="mt-3 max-w-48">
                <Progress value={tierProgress} className="h-2" />
                <p className="mt-1 text-[10px] text-muted-foreground">Progress to next rank</p>
              </div>
            </div>

            {/* Insight + quick stats */}
            <div className="flex-1 space-y-4">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "{insight}"
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                  <ShieldCheck size={14} className="mx-auto text-primary mb-1" />
                  <p className="font-mono text-lg font-bold text-foreground">{noHintRate}%</p>
                  <p className="text-[10px] text-muted-foreground">No-Hint Rate</p>
                </div>
                <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                  <Target size={14} className="mx-auto text-primary mb-1" />
                  <p className="font-mono text-lg font-bold text-foreground">{records.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Solves</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MILESTONES ── */}
        {(() => {
          const milestones = getAllMilestones();
          const achievedCount = milestones.filter((m) => m.state === "achieved").length;
          if (achievedCount === 0 && records.length < 5) return null;
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

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all relative",
                        isAchieved && "bg-primary/5 border-primary/25",
                        isInProgress && "bg-card border-border",
                        isLocked && "opacity-35",
                        m.isNext && !isAchieved && "ring-1 ring-primary/30"
                      )}
                      title={m.label}
                    >
                      <div className="flex items-start gap-2.5">
                        <IconComp
                          size={18}
                          className={cn(
                            "shrink-0 mt-0.5",
                            isAchieved ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs leading-tight truncate",
                            isAchieved ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>{m.label}</p>
                          {isInProgress && (
                            <div className="mt-1.5 space-y-1">
                              <Progress value={progressPercent} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground">{m.progressText}</p>
                            </div>
                          )}
                          {isAchieved && (
                            <p className="text-[10px] text-primary/70 mt-0.5">Achieved</p>
                          )}
                        </div>
                      </div>
                      {m.isNext && !isAchieved && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground uppercase tracking-wider">
                          Next
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── ACCURACY INSIGHTS ── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <CheckCircle size={15} className="text-primary" />
            Accuracy Insights
            <TrendBadge trend={accuracyTrend} invertColor />
          </h3>
          <p className="text-xs text-muted-foreground mb-3">{accuracyInsight}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{avgMistakes}</p>
              <p className="text-xs text-muted-foreground">Avg Mistakes</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{noHintPercent}%</p>
              <p className="text-xs text-muted-foreground">No Hints Used</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">{unassistedPercent}%</p>
              <p className="text-xs text-muted-foreground">Unassisted</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-bold text-foreground">
                {Math.round((summary.averageHints ?? 0) * 10) / 10}
              </p>
              <p className="text-xs text-muted-foreground">Avg Hints</p>
            </div>
          </div>
        </div>

        {/* ── PERSONAL BESTS ── */}
        {bestByType.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <Trophy size={15} className="text-primary" />
              Personal Bests
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{bestInsight}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {bestByType.map(({ type, time, difficulty, score }) => (
                <div key={type} className="rounded-lg border bg-secondary/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {CATEGORY_INFO[type]?.name}
                    </span>
                  </div>
                  <p className="font-mono text-lg font-bold text-primary">{formatTime(time)}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS] ?? difficulty}
                    {" · "}{score} pts
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AVERAGE PERFORMANCE ── */}
        {avgByType.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              Average Performance
              <TrendBadge trend={timeTrend} invertColor />
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{avgInsight}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {avgByType.map(({ type, avg, count, avgScore }) => (
                <div key={type} className="rounded-lg border bg-secondary/30 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {CATEGORY_INFO[type]?.name}
                    </span>
                  </div>
                  <p className="font-mono text-lg font-bold text-foreground">{formatTime(avg)}</p>
                  <p className="text-[10px] text-muted-foreground">{count} solves · {avgScore} avg pts</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SOLVE HISTORY (collapsible) ── */}
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
                        <span className="flex items-center gap-1.5">
                          {info?.name ?? r.puzzleType}
                        </span>
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
                                <b.icon size={13} className="text-primary/70" />
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
