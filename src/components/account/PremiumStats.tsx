/**
 * Puzzlecraft+ Advanced Stats — premium-only section.
 * Shows solve history, personal bests, average performance, and accuracy insights.
 * Data source: solveTracker records (completed solves only).
 */
import { useMemo, useState, useCallback } from "react";
import { getSolveRecords, getSolveSummary, type SolveRecord } from "@/lib/solveTracker";
import { CATEGORY_INFO, DIFFICULTY_LABELS, type PuzzleCategory } from "@/lib/puzzleTypes";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { Clock, Trophy, Target, BarChart3, Sparkles, Zap, CheckCircle, FlaskConical, Trash2 } from "lucide-react";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { cn } from "@/lib/utils";
import { generateDemoSolves, clearDemoSolves, hasDemoData } from "@/lib/demoStats";
import { useUserAccount } from "@/contexts/UserAccountContext";
import { hasPremiumAccess } from "@/lib/premiumAccess";
import { Button } from "@/components/ui/button";

const MIN_SOLVES_FOR_AVG = 2;

const ALL_CATEGORIES: PuzzleCategory[] = [
  "crossword", "word-fill", "number-fill", "sudoku",
  "word-search", "kakuro", "nonogram", "cryptogram",
];

export default function PremiumStats() {
  const records = useMemo(() => getSolveRecords(), []);
  const summary = useMemo(() => getSolveSummary(), []);

  if (!summary || records.length === 0) {
    return (
      <div className="rounded-xl border border-primary/20 bg-card p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-primary mb-3" />
        <p className="text-sm text-muted-foreground">
          Complete some puzzles to unlock advanced analytics.
        </p>
      </div>
    );
  }

  const recent20 = records.slice(0, 20);

  // Personal bests per type
  const bestByType: { type: PuzzleCategory; time: number; difficulty: string }[] = [];
  const avgByType: { type: PuzzleCategory; avg: number; count: number }[] = [];
  
  for (const cat of ALL_CATEGORIES) {
    const catRecords = records.filter((r) => r.puzzleType === cat);
    if (catRecords.length === 0) continue;
    
    const best = catRecords.reduce((a, b) => (a.solveTime < b.solveTime ? a : b));
    bestByType.push({ type: cat, time: best.solveTime, difficulty: best.difficulty });
    
    if (catRecords.length >= MIN_SOLVES_FOR_AVG) {
      const total = catRecords.reduce((s, r) => s + r.solveTime, 0);
      avgByType.push({ type: cat, avg: Math.round(total / catRecords.length), count: catRecords.length });
    }
  }

  // Accuracy insights
  const totalMistakes = records.reduce((s, r) => s + r.mistakesCount, 0);
  const avgMistakes = Math.round((totalMistakes / records.length) * 10) / 10;
  const noHintSolves = records.filter((r) => r.hintsUsed === 0 && !r.assisted);
  const noHintPercent = Math.round((noHintSolves.length / records.length) * 100);
  const unassistedPercent = Math.round((summary.unassistedCount / records.length) * 100);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          Advanced Analytics
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Puzzlecraft+
        </span>
      </div>

      {/* Accuracy Insights */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-primary" />
          Accuracy Insights
        </h3>
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
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-primary" />
            Personal Bests
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bestByType.map(({ type, time, difficulty }) => (
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
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average Performance */}
      {avgByType.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 size={15} className="text-primary" />
            Average Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {avgByType.map(({ type, avg, count }) => (
              <div key={type} className="rounded-lg border bg-secondary/30 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <PuzzleIcon type={type} size={14} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {CATEGORY_INFO[type]?.name}
                  </span>
                </div>
                <p className="font-mono text-lg font-bold text-foreground">{formatTime(avg)}</p>
                <p className="text-[10px] text-muted-foreground">{count} solves</p>
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
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Hints</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent20.map((r) => {
                const info = CATEGORY_INFO[r.puzzleType];
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
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {r.hintsUsed > 0 ? r.hintsUsed : "—"}
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
