/**
 * PuzzleHeader.tsx  ← CREATE NEW FILE
 * src/components/puzzles/PuzzleHeader.tsx
 *
 * Shared in-game header that replaces <PuzzleTimer> at the top of every
 * grid component. Renders:
 *   Row 1 — Back button · Type+difficulty badge · [spacer]
 *   Row 2 — Stats bar: live timer | mistakes | personal best
 *   Row 3 — Progress bar with word/cell count
 *
 * Drop-in: wherever a grid component renders <PuzzleTimer …/> at the top,
 * replace it with <PuzzleHeader …/>. The props it needs are listed below.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatSessionTime,
  getPuzzleTypeLabel,
  getDifficultyLabel,
  type SessionDifficulty,
} from "@/hooks/usePuzzleSession";
import type { PuzzleCategory } from "@/lib/puzzleTypes"; // adjust to your path

// ─── Props ────────────────────────────────────────────────────────────────────

interface PuzzleHeaderProps {
  /** e.g. "crossword", "sudoku", "word-search" */
  puzzleType: PuzzleCategory;
  /** e.g. "medium" */
  difficulty?: SessionDifficulty | string;
  /** Optional: shown under the badge. E.g. "Daily #142" or "Quick Play" */
  title?: string;
  /** Live elapsed seconds from usePuzzleTimer() */
  elapsed: number;
  /** Number of mistakes this session */
  mistakes: number;
  /** Personal best in seconds, or null if no record yet */
  personalBest: number | null;
  /** Filled count — e.g. 7 */
  progressCurrent: number;
  /** Total count — e.g. 20 */
  progressTotal: number;
  /** Unit label — e.g. "words" | "cells" | "clues" */
  progressUnit?: string;
  /** Where the back button navigates. Default: -1 (browser back) */
  backPath?: string;
  /** Label next to the back chevron. Default: "Play" */
  backLabel?: string;
  /** Called when back is pressed (optional — use instead of backPath for custom logic) */
  onBack?: () => void;
  /** Extra class on the outer container */
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MISTAKE_THRESHOLDS = {
  good:    { max: 0,  label: "Perfect",  color: "text-emerald-600 dark:text-emerald-400" },
  ok:      { max: 2,  label: undefined,  color: "text-foreground" },
  warn:    { max: 5,  label: undefined,  color: "text-amber-600 dark:text-amber-400" },
  bad:     { max: Infinity, label: undefined, color: "text-destructive" },
};

function getMistakeColor(n: number): string {
  if (n === 0) return MISTAKE_THRESHOLDS.good.color;
  if (n <= 2)  return MISTAKE_THRESHOLDS.ok.color;
  if (n <= 5)  return MISTAKE_THRESHOLDS.warn.color;
  return MISTAKE_THRESHOLDS.bad.color;
}

// Is the player currently beating their personal best?
function isAheadOfBest(elapsed: number, best: number | null): boolean {
  return best !== null && elapsed < best && elapsed > 5;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PuzzleHeader = ({
  puzzleType,
  difficulty,
  title,
  elapsed,
  mistakes,
  personalBest,
  progressCurrent,
  progressTotal,
  progressUnit = "cells",
  backPath,
  backLabel = "Play",
  onBack,
  className,
}: PuzzleHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const typeLabel = getPuzzleTypeLabel(puzzleType);
  const diffLabel = getDifficultyLabel(difficulty);
  const badgeText = diffLabel ? `${typeLabel} · ${diffLabel}` : typeLabel;

  const progressFraction =
    progressTotal > 0 ? Math.min(1, progressCurrent / progressTotal) : 0;

  const ahead = isAheadOfBest(elapsed, personalBest);

  // Timer color: orange while under best, normal otherwise
  const timerColor = ahead
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-primary";

  // Streak-style pulse when very close to personal best
  const timerPulse = personalBest !== null && elapsed > personalBest - 10 && elapsed < personalBest;

  const mistakeColor = getMistakeColor(mistakes);

  return (
    <div
      className={cn(
        "sticky top-0 z-20 bg-background/95 backdrop-blur-sm",
        "border-b border-border/60",
        className
      )}
    >
      {/* ── Row 1: back · badge · spacer ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {/* Back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground active:opacity-60 transition-opacity min-w-[60px]"
          aria-label="Back"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>{backLabel}</span>
        </button>

        {/* Center: badge + optional title */}
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
            {badgeText}
          </span>
          {title && (
            <span className="text-[12px] font-medium text-foreground leading-tight">
              {title}
            </span>
          )}
        </div>

        {/* Spacer to keep badge centered */}
        <div className="min-w-[60px]" />
      </div>

      {/* ── Row 2: stats bar ── */}
      <div className="grid grid-cols-3 border-t border-border/40 divide-x divide-border/40">
        {/* Timer */}
        <div className="flex flex-col items-center py-1.5">
          <span
            className={cn(
              "font-mono text-[15px] font-semibold tabular-nums leading-none transition-colors",
              timerColor,
              timerPulse && "animate-pulse"
            )}
          >
            {formatSessionTime(elapsed)}
          </span>
          <span className="mt-0.5 text-[9px] text-muted-foreground uppercase tracking-wide">
            {ahead ? "on track ↑" : "time"}
          </span>
        </div>

        {/* Mistakes */}
        <div className="flex flex-col items-center py-1.5">
          <span
            className={cn(
              "text-[15px] font-semibold leading-none tabular-nums transition-colors",
              mistakeColor
            )}
          >
            {mistakes === 0 ? "—" : mistakes}
          </span>
          <span className="mt-0.5 text-[9px] text-muted-foreground uppercase tracking-wide">
            {mistakes === 0 ? "perfect" : "mistake" + (mistakes === 1 ? "" : "s")}
          </span>
        </div>

        {/* Personal best */}
        <div className="flex flex-col items-center py-1.5">
          <span className="text-[15px] font-semibold leading-none tabular-nums text-foreground">
            {personalBest ? formatSessionTime(personalBest) : "—"}
          </span>
          <span className="mt-0.5 text-[9px] text-muted-foreground uppercase tracking-wide">
            {personalBest ? "your best" : "no record"}
          </span>
        </div>
      </div>

      {/* ── Row 3: progress bar ── */}
      {progressTotal > 0 && (
        <div className="px-4 pb-2.5 pt-1.5">
          {/* Track */}
          <div className="h-[3px] w-full rounded-full bg-border/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressFraction * 100}%` }}
            />
          </div>
          {/* Labels */}
          <div className="mt-1 flex justify-between">
            <span className="text-[10px] text-muted-foreground">
              {progressCurrent} / {progressTotal} {progressUnit}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(progressFraction * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleHeader;
