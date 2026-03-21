/**
 * Puzzlecraft+ Advanced Stats — premium-only section.
 * Shows solve history, personal bests, average performance, accuracy insights,
 * player rating with skill tier, trend indicators, and no-hint rate.
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
import { Clock, Trophy, Target, BarChart3, Zap, CheckCircle, FlaskConical, Trash2, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";
import { generateDemoSolves, clearDemoSolves, hasDemoData } from "@/lib/demoStats";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { hasPremiumAccess } from "@/lib/premiumAccess";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const MIN_SOLVES_FOR_AVG = 2;

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
      "inline-flex items-center gap-0.5 text-[10px] font-medium",
      isGood ? "text-primary" : "text-destructive"
    )}>
      {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
    </span>
  );
}

export default function PremiumStats({ onDataChange }: { onDataChange?: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { account, subscribed } = useUserAccount();
  const isAdmin = account?.isAdmin ?? false;
  const records = useMemo(() => getSolveRecords(), [refreshKey]);
  const summary = useMemo(() => getSolveSummary(), [refreshKey]);
  const demoActive = useMemo(() => hasDemoData(), [refreshKey]);

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

  const recent20 = records.slice(0, 20);

  // ── New scoring system ──
  const playerRating = computePlayerRating(records);
  const skillTier = getSkillTier(playerRating);
  const tierProgress = getTierProgress(playerRating);
  const tierColor = getTierColor(skillTier);

  // Personal bests per type
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
      avgByType.push({
        type: cat,
        avg: Math.round(total / catRecords.length),
        count: catRecords.length,
        avgScore: Math.round(totalScore / catRecords.length),
      });
    }
  }

  // Accuracy insights (using forgiven mistakes)
  const totalTrueMistakes = records.reduce((s, r) => s + trueMistakes(r), 0);
  const avgMistakes = Math.round((totalTrueMistakes / records.length) * 10) / 10;
  const noHintSolves = records.filter((r) => r.hintsUsed === 0 && !r.assisted);
  const noHintPercent = Math.round((noHintSolves.length / records.length) * 100);
  const unassistedPercent = Math.round((summary.unassistedCount / records.length) * 100);

  // Trends (records are newest-first)
  const timeTrend = computeTrend(records, (r) => r.solveTime);
  const accuracyTrend = computeTrend(records, (r) => trueMistakes(r));
  const scoreTrend = computeTrend(records, (r) => computeSolveScore(r));

  // No-hint rate
  const noHintRate = Math.round((noHintSolves.length / records.length) * 100);

  // Insight text
  const accuracyInsight = avgMistakes < 1
    ? "You're solving with impressive precision."
    : avgMistakes < 2
      ? "Solid accuracy — room to tighten up on harder puzzles."
      : "Try slowing down on tricky sections to reduce mistakes.";

  const bestInsight = bestByType.length >= 3
    ? `You've set personal bests across ${bestByType.length} puzzle types.`
    : "Keep solving to set more personal records.";

  const avgInsight = avgByType.length > 0
    ? `Your consistency is ${timeTrend === "down" ? "improving" : timeTrend === "up" ? "worth watching" : "holding steady"} over recent solves.`
    : "Play more to track your average performance.";

  return (
    <div className="space-y-8">
      {adminControls}
      {demoActive && (
        <p className="text-xs text-primary/60 italic">
          ⚡ Viewing demo data — not from real solves
        </p>
      )}
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Advanced Analytics
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Puzzlecraft+
        </span>
      </div>

      {/* Top metrics row: Player Rating + No-Hint Rate + Total Solves */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* Player Rating with tier */}
        <div className="rounded-xl border bg-card p-4 text-center col-span-2 sm:col-span-1">
          <Zap className="mx-auto h-5 w-5 text-primary mb-2" />
          <p className="font-mono text-2xl font-bold text-foreground">
            {playerRating}
            <TrendBadge trend={scoreTrend} />
          </p>
          <p className={cn("mt-0.5 text-xs font-semibold", tierColor)}>{skillTier}</p>
          <Progress value={tierProgress} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">Player Rating</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <ShieldCheck className="mx-auto h-5 w-5 text-primary mb-2" />
          <p className="font-mono text-2xl font-bold text-foreground">{noHintRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">No-Hint Rate</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Target className="mx-auto h-5 w-5 text-primary mb-2" />
          <p className="font-mono text-2xl font-bold text-foreground">{records.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total Solves</p>
        </div>
      </div>

      {/* Accuracy Insights */}
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

      {/* Personal Bests */}
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
                  <PuzzleIcon type={type} size={14} className="text-muted-foreground" />
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

      {/* Average Performance */}
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
                  <PuzzleIcon type={type} size={14} className="text-muted-foreground" />
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

      {/* Solve History (last 20) */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock size={15} className="text-primary" />
          Solve History
          <span className="text-xs text-muted-foreground font-normal">Last 20</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Difficulty</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Score</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent20.map((r) => {
                const info = CATEGORY_INFO[r.puzzleType];
                const score = computeSolveScore(r);
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <PuzzleIcon type={r.puzzleType} size={13} className="text-muted-foreground" />
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
