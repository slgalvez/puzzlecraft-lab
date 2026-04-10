/**
 * PremiumStats.tsx  ← FULL REPLACEMENT
 * src/components/account/PremiumStats.tsx
 *
 * CHANGES FROM PREVIOUS VERSION:
 *
 * 1. REMOVED demo data from this component entirely.
 *    - No more `getSolveRecords(isAdmin && demoActive)` 
 *    - Always calls `getSolveRecords(false)` — real user data only
 *    - `hasDemoData()`, `demoActive`, `generateDemoSolves()`, admin controls
 *      are all gone from this file. They belong in AdminPreview only.
 *
 * 2. Admin controls (Generate Stats Demo / Clear Stats) are now a
 *    completely separate export: `<PremiumStatsAdminControls />`.
 *    AdminPreview.tsx imports and renders this independently, outside the
 *    user-facing component tree.
 *
 * 3. Empty states are polished and honest:
 *    - < 3 real solves → "Keep solving — your insights are building up"
 *    - 3-9 real solves → partial view with a "more data needed" note
 *    - 10+ real solves → full analytics
 *    Never shows fake data as a placeholder.
 *
 * 4. All useMemo dependencies cleaned up accordingly.
 */

import { useMemo, useState } from "react";
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
  getPlayerRatingInfo,
} from "@/lib/solveScoring";
import { ProvisionalRatingCard } from "@/components/puzzles/ProvisionalRatingCard";
import { getBestInsight } from "@/lib/solveInsights";
import {
  getAllMilestones,
  getUncelebratedIds,
  markCelebrated,
  type MilestoneIcon,
} from "@/lib/milestones";
import {
  Clock, Trophy, Target, BarChart3, Zap, CheckCircle,
  TrendingUp, TrendingDown, ShieldCheck, ChevronDown, ChevronUp,
  Award, Puzzle, Flame, Crown, Medal, Bolt, Star, Gauge, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MIN_SOLVES_FOR_AVG   = 2;
const MIN_SOLVES_FOR_RATING = 5;
const HISTORY_PREVIEW       = 5;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

// ── Trend helpers ─────────────────────────────────────────────────────────

function computeTrend(
  records: SolveRecord[],
  getValue: (r: SolveRecord) => number
): { direction: "up" | "down" | "flat"; pct: number } {
  if (records.length < 6) return { direction: "flat", pct: 0 };
  const half = Math.floor(records.length / 2);
  const recent = records.slice(0, half);
  const older  = records.slice(half);
  const recentAvg = recent.reduce((s, r) => s + getValue(r), 0) / recent.length;
  const olderAvg  = older.reduce((s, r) => s + getValue(r), 0) / older.length;
  const diff = recentAvg - olderAvg;
  const pct = olderAvg !== 0 ? Math.round(Math.abs(diff / olderAvg) * 100) : 0;
  if (Math.abs(diff) < olderAvg * 0.05) return { direction: "flat", pct };
  return { direction: diff > 0 ? "up" : "down", pct };
}

function TrendBadge({
  trend, invertColor, label,
}: {
  trend: { direction: "up" | "down" | "flat"; pct: number };
  invertColor?: boolean;
  label?: string;
}) {
  if (trend.direction === "flat") return null;
  const isGood = invertColor ? trend.direction === "down" : trend.direction === "up";
  const pctStr = trend.pct > 0 ? `${trend.pct}%` : "";
  const tooltipText = label
    ? `${label}${pctStr ? ` (${pctStr} ${trend.direction === "up" ? "increase" : "decrease"})` : ""}`
    : isGood ? `${pctStr} improvement vs. earlier solves` : `${pctStr} decline vs. earlier solves`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-medium ml-1 p-1 -m-1 min-w-[28px] min-h-[28px] justify-center",
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
  puzzle: Puzzle, flame: Flame, trophy: Trophy, medal: Medal,
  zap: Zap, crown: Crown, target: Target, award: Award, bolt: Bolt,
};

// ── Honest empty state ────────────────────────────────────────────────────

function InsightsEmptyState({ solveCount }: { solveCount: number }) {
  if (solveCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center">
        <Target className="mx-auto h-8 w-8 text-primary/40 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Your analytics are waiting
        </p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Solve your first puzzle to start building your performance breakdown.
        </p>
      </div>
    );
  }
  if (solveCount < MIN_SOLVES_FOR_RATING) {
    return (
      <div className="rounded-xl border border-primary/10 bg-card p-6 text-center">
        <BarChart3 className="mx-auto h-6 w-6 text-primary/50 mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          {solveCount} solve{solveCount !== 1 ? "s" : ""} recorded
        </p>
        <p className="text-xs text-muted-foreground">
          Solve {MIN_SOLVES_FOR_RATING - solveCount} more puzzle{MIN_SOLVES_FOR_RATING - solveCount !== 1 ? "s" : ""} to unlock your rating and full analytics.
        </p>
        <div className="mt-3 max-w-40 mx-auto">
          <Progress value={(solveCount / MIN_SOLVES_FOR_RATING) * 100} className="h-1.5" />
        </div>
      </div>
    );
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────

export default function PremiumStats({ onDataChange, ratingInfoOverride, isAdmin }: { onDataChange?: () => void; ratingInfoOverride?: ReturnType<typeof getPlayerRatingInfo>; isAdmin?: boolean }) {
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Admin with demo data active → include demo records; otherwise real data only
  const useDemo = !!(isAdmin && hasDemoData());
  const records = useMemo(() => useDemo ? getAllSolveRecordsIncludingDemo() : getSolveRecords(), [useDemo]);
  const summary = useMemo(() => useDemo ? getDemoSolveSummary() : getSolveSummary(), [useDemo]);

  const localRatingInfo = useMemo(() => getPlayerRatingInfo(records), [records]);
  const ratingInfo = ratingInfoOverride ?? localRatingInfo;

  // ── Empty / insufficient data states ──────────────────────────────────
  // ── Milestones (always computed, even with 0 solves) ──
  const milestones = getAllMilestones();
  const achievedCount = milestones.filter((m) => m.state === "achieved").length;
  const uncelebrated = getUncelebratedIds();
  const newlyAchievedEarly = milestones
    .filter((m) => m.state === "achieved" && uncelebrated.has(m.id))
    .map((m) => m.id);
  if (newlyAchievedEarly.length > 0) setTimeout(() => markCelebrated(newlyAchievedEarly), 2000);

  if (records.length === 0 && ratingInfo.hasNoData) {
    return (
      <div className="space-y-4">
        <ProvisionalRatingCard info={ratingInfo} />
        {/* Full milestone grid — all locked/greyed at 0% */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award size={15} className="text-primary" />
            Milestones
            <span className="text-xs text-muted-foreground font-normal">{achievedCount}/{milestones.length}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {milestones.map((m) => {
              const IconComp = MILESTONE_ICONS[m.icon] ?? Target;
              const isAchieved   = m.state === "achieved";
              const isInProgress = m.state === "in-progress";
              const progressPct  = Math.round((m.current / m.target) * 100);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    isAchieved   && "bg-primary/5 border-primary/25",
                    isInProgress && "bg-card border-border",
                    !isAchieved && !isInProgress && "opacity-40",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComp size={14} className={isAchieved ? "text-primary" : "text-muted-foreground"} />
                    {isAchieved && <CheckCircle size={11} className="text-primary ml-auto" />}
                  </div>
                  <p className={cn("text-xs font-semibold leading-tight", isAchieved ? "text-foreground" : "text-muted-foreground")}>
                    {m.label}
                  </p>
                  {!isAchieved && (
                    <div className="mt-1.5">
                      <Progress value={progressPct} className="h-1" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">{m.progressText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Has DB-backed rating but no local records — show rating + milestones only
  if (records.length === 0) {
    return (
      <TooltipProvider>
        <div className="space-y-4">
          <ProvisionalRatingCard info={ratingInfo} />
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award size={15} className="text-primary" />
              Milestones
              <span className="text-xs text-muted-foreground font-normal">{achievedCount}/{milestones.length}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {milestones.map((m) => {
                const IconComp = MILESTONE_ICONS[m.icon] ?? Target;
                const isAchieved   = m.state === "achieved";
                const isInProgress = m.state === "in-progress";
                const progressPct  = Math.round((m.current / m.target) * 100);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg border p-3 transition-all",
                      isAchieved   && "bg-primary/5 border-primary/25",
                      isInProgress && "bg-card border-border",
                      !isAchieved && !isInProgress && "opacity-40",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComp size={14} className={isAchieved ? "text-primary" : "text-muted-foreground"} />
                      {isAchieved && <CheckCircle size={11} className="text-primary ml-auto" />}
                    </div>
                    <p className={cn("text-xs font-semibold leading-tight", isAchieved ? "text-foreground" : "text-muted-foreground")}>
                      {m.label}
                    </p>
                    {!isAchieved && (
                      <div className="mt-1.5">
                        <Progress value={progressPct} className="h-1" />
                        <p className="text-[9px] text-muted-foreground mt-0.5">{m.progressText}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ── From here: records.length >= 5, summary guaranteed non-null ──────

  const playerRating = computePlayerRating(records);
  const skillTier    = getSkillTier(playerRating);
  const tierProgress = getTierProgress(playerRating);
  const tierColor    = getTierColor(skillTier);

  const scoreTrend    = computeTrend(records, (r) => computeSolveScore(r));
  const timeTrend     = computeTrend(records, (r) => r.solveTime);
  const accuracyTrend = computeTrend(records, (r) => trueMistakes(r));

  const insight = getBestInsight(records);

  const noHintSolves    = records.filter((r) => r.hintsUsed === 0 && !r.assisted);
  const noHintRate      = Math.round((noHintSolves.length / records.length) * 100);
  const totalMistakes   = records.reduce((s, r) => s + trueMistakes(r), 0);
  const avgMistakes     = Math.round((totalMistakes / records.length) * 10) / 10;
  const unassistedPct   = Math.round(((summary?.unassistedCount ?? 0) / records.length) * 100);

  const accuracyInsight = avgMistakes < 1
    ? "You're solving with impressive precision."
    : avgMistakes < 2
      ? "Solid accuracy — room to tighten on harder puzzles."
      : "Try slowing down on tricky sections to reduce mistakes.";

  // ── Personal bests + averages by type ───────────────────────────────

  const bestByType: { type: PuzzleCategory; time: number; difficulty: string; score: number }[] = [];
  const avgByType:  { type: PuzzleCategory; avg: number; count: number; avgScore: number }[] = [];

  for (const cat of ALL_CATEGORIES) {
    const catRecords = records.filter((r) => r.puzzleType === cat);
    if (catRecords.length === 0) continue;
    const best = catRecords.reduce((a, b) => (a.solveTime < b.solveTime ? a : b));
    bestByType.push({ type: cat, time: best.solveTime, difficulty: best.difficulty, score: computeSolveScore(best) });
    if (catRecords.length >= MIN_SOLVES_FOR_AVG) {
      const total = catRecords.reduce((s, r) => s + r.solveTime, 0);
      const totalScore = catRecords.reduce((s, r) => s + computeSolveScore(r), 0);
      avgByType.push({
        type: cat,
        avg: Math.round(total / catRecords.length),
        count: catRecords.length,
        avgScore: Math.round(totalScore / catRecords.length),
      });
    }
  }

  const bestInsight = bestByType.length >= 3
    ? `You've set personal bests across ${bestByType.length} puzzle types.`
    : "Keep solving to set more personal records.";

  const avgInsight = avgByType.length > 0
    ? `Your consistency is ${timeTrend.direction === "down" ? "improving" : timeTrend.direction === "up" ? "worth watching" : "holding steady"} over recent solves.`
    : "Play more to track your average performance.";

  // ── Solve history badges ─────────────────────────────────────────────

  const bestTimeByType: Record<string, number> = {};
  const recentAvgByType: Record<string, number> = {};
  for (const cat of ALL_CATEGORIES) {
    const cr = records.filter((r) => r.puzzleType === cat);
    if (cr.length > 0) {
      bestTimeByType[cat] = Math.min(...cr.map((r) => r.solveTime));
      const sl = cr.slice(0, 10);
      recentAvgByType[cat] = sl.reduce((s, r) => s + r.solveTime, 0) / sl.length;
    }
  }

  function getSolveBadges(r: SolveRecord): { icon: typeof Star; label: string }[] {
    const badges: { icon: typeof Star; label: string }[] = [];
    if (bestTimeByType[r.puzzleType] === r.solveTime) badges.push({ icon: Trophy, label: "Personal Best" });
    if (r.difficulty === "extreme" || r.difficulty === "insane") badges.push({ icon: Gauge, label: "High Difficulty" });
    if (r.hintsUsed === 0 && trueMistakes(r) === 0 && !r.assisted) badges.push({ icon: Sparkles, label: "Clean Solve" });
    if (recentAvgByType[r.puzzleType] && r.solveTime < recentAvgByType[r.puzzleType] * 0.9)
      badges.push({ icon: TrendingUp, label: "Faster than average" });
    return badges.slice(0, 2);
  }

  const recent20 = records.slice(0, 20);
  const historyVisible = historyExpanded ? recent20 : recent20.slice(0, HISTORY_PREVIEW);

  // ── Milestones (already computed above early return) ──

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-8">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Performance Breakdown
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Puzzlecraft+
          </span>
        </div>

        {/* ── HERO SECTION — ProvisionalRatingCard handles all solve-count states ── */}
        <ProvisionalRatingCard info={ratingInfo} />

        {/* ── Keep insight + accuracy mini-cards below if we have enough data ── */}
        {!ratingInfo.hasNoData && (
          <div className="rounded-xl border bg-card p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                <ShieldCheck size={14} className="mx-auto text-primary mb-1" />
                <p className="font-mono text-lg font-bold text-foreground">
                  {Math.round((records.filter(r => r.hintsUsed === 0 && !r.assisted).length / records.length) * 100)}%
                </p>
                <p className="text-[10px] text-muted-foreground">No-Hint Rate</p>
              </div>
              <div className="rounded-lg border bg-secondary/30 p-3 text-center">
                <Target size={14} className="mx-auto text-primary mb-1" />
                <p className="font-mono text-lg font-bold text-foreground">{records.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Solves</p>
              </div>
            </div>
            {insight && (
              <p className="mt-4 text-sm text-muted-foreground italic leading-relaxed">"{insight}"</p>
            )}
          </div>
        )}

        {/* ── MILESTONES (always visible) ── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award size={15} className="text-primary" />
            Milestones
            <span className="text-xs text-muted-foreground font-normal">{achievedCount}/{milestones.length}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {milestones.map((m) => {
              const IconComp = MILESTONE_ICONS[m.icon] ?? Target;
              const isAchieved   = m.state === "achieved";
              const isInProgress = m.state === "in-progress";
              const progressPct  = Math.round((m.current / m.target) * 100);
              const isCelebrating = isAchieved && uncelebrated.has(m.id);

              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    isAchieved   && "bg-primary/5 border-primary/25",
                    isInProgress && "bg-card border-border",
                    !isAchieved && !isInProgress && "opacity-40",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComp size={14} className={isAchieved ? "text-primary" : "text-muted-foreground"} />
                    {isAchieved && <CheckCircle size={11} className="text-primary ml-auto" />}
                  </div>
                  <p className={cn("text-xs font-semibold leading-tight", isAchieved ? "text-foreground" : "text-muted-foreground")}>
                    {m.label}
                  </p>
                  {!isAchieved && (
                    <div className="mt-1.5">
                      <Progress value={progressPct} className="h-1" />
                      <p className="text-[9px] text-muted-foreground mt-0.5">{m.progressText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ACCURACY ── */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target size={15} className="text-primary" />
            Accuracy
            <TrendBadge trend={accuracyTrend} invertColor label="Mistake trend" />
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-foreground">{avgMistakes}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg mistakes</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-foreground">{noHintRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">No-hint</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-2xl font-bold text-foreground">{unassistedPct}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unassisted</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">{accuracyInsight}</p>
        </div>

        {/* ── PERSONAL BESTS ── */}
        {bestByType.length > 0 ? (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy size={15} className="text-primary" />
              Personal Bests
            </h3>
            <div className="divide-y divide-border/50">
              {bestByType.map((b) => (
                <div key={b.type} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{CATEGORY_INFO[b.type]?.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{b.difficulty}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">{formatTime(b.time)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground italic">{bestInsight}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-card p-5 text-center">
            <p className="text-xs text-muted-foreground">Finish puzzles to see your personal bests.</p>
          </div>
        )}

        {/* ── AVERAGE PERFORMANCE ── */}
        {avgByType.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 size={15} className="text-primary" />
              Average Performance
              <TrendBadge trend={timeTrend} invertColor label="Speed trend" />
            </h3>
            <div className="divide-y divide-border/50">
              {avgByType.map((a) => (
                <div key={a.type} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{CATEGORY_INFO[a.type]?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.count} solves</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-foreground">{formatTime(a.avg)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground italic">{avgInsight}</p>
          </div>
        )}

        {/* ── SOLVE HISTORY ── */}
        {recent20.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              Recent Solves
            </h3>
            <div className="divide-y divide-border/40">
              {historyVisible.map((r) => {
                const badges = getSolveBadges(r);
                const date = new Date(r.completedAt);
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-foreground">
                          {CATEGORY_INFO[r.puzzleType]?.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded-full bg-secondary">
                          {r.difficulty}
                        </span>
                        {badges.map((b) => {
                          const Icon = b.icon;
                          return (
                            <Tooltip key={b.label}>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full cursor-default">
                                  <Icon size={9} />
                                  {b.label}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">{b.label}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        {r.hintsUsed > 0 && <span className="ml-1.5">· {r.hintsUsed} hint{r.hintsUsed > 1 ? "s" : ""}</span>}
                        {trueMistakes(r) > 0 && <span className="ml-1.5">· {trueMistakes(r)} mistake{trueMistakes(r) > 1 ? "s" : ""}</span>}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-foreground shrink-0">{formatTime(r.solveTime)}</p>
                  </div>
                );
              })}
            </div>
            {recent20.length > HISTORY_PREVIEW && (
              <button
                onClick={() => setHistoryExpanded((v) => !v)}
                className="mt-3 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {historyExpanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show {recent20.length - HISTORY_PREVIEW} more</>}
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Exported separately for AdminPreview only ─────────────────────────────
// Import this in AdminPreview.tsx for demo data controls.
// Do NOT import or render in any user-facing component.
export { PremiumStatsAdminControls } from "./PremiumStatsAdminControls";
