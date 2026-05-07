/**
 * ScoreBreakdown.tsx
 * Shows how speed, accuracy, and hints multiplied the base score for a solve.
 * Quiet, monospace, single block — designed to slot into the post-solve panel.
 */

import { useMemo } from "react";
import { Gauge, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/hooks/usePuzzleTimer";
import { DIFFICULTY_LABELS } from "@/lib/puzzleTypes";
import { computeScoreBreakdown } from "@/lib/solveScoring";
import type { SolveRecord } from "@/lib/solveTracker";

interface Props {
  record: SolveRecord;
  className?: string;
}

function multClass(value: number): string {
  if (value > 1.001) return "text-emerald-500";
  if (value < 0.999) return "text-rose-500";
  return "text-muted-foreground";
}

function fmtMult(value: number): string {
  return `×${value.toFixed(2)}`;
}

export function ScoreBreakdown({ record, className }: Props) {
  const b = useMemo(() => computeScoreBreakdown(record), [record]);
  if (!b) return null;

  const speedDelta = record.solveTime - b.expectedTime;
  const speedLabel =
    speedDelta <= 0
      ? `${formatTime(record.solveTime)} · ${formatTime(-speedDelta)} under par`
      : `${formatTime(record.solveTime)} · ${formatTime(speedDelta)} over par`;

  const accuracyLabel =
    b.trueMistakes === 0
      ? "Clean solve"
      : `${b.trueMistakes} mistake${b.trueMistakes !== 1 ? "s" : ""}`;

  const hintLabel =
    record.hintsUsed === 0
      ? "No hints"
      : `${record.hintsUsed} hint${record.hintsUsed !== 1 ? "s" : ""}`;

  const rows: Array<{ icon: React.ElementType; label: string; detail: string; mult: number }> = [
    { icon: Gauge,     label: "Speed",    detail: speedLabel,    mult: b.speedFactor },
    { icon: Target,    label: "Accuracy", detail: accuracyLabel, mult: b.accuracyFactor },
    { icon: Lightbulb, label: "Hints",    detail: hintLabel,     mult: b.hintFactor },
  ];

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Score breakdown
        </p>
        <p className="text-[10px] text-muted-foreground">
          Base 1000 · {DIFFICULTY_LABELS[record.difficulty]} {fmtMult(b.difficultyMult)}
        </p>
      </div>

      <div className="space-y-1">
        {rows.map(({ icon: Icon, label, detail, mult }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <Icon size={12} className="text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium w-16 shrink-0">{label}</span>
            <span className="text-muted-foreground flex-1 truncate">{detail}</span>
            <span className={cn("font-mono font-semibold tabular-nums", multClass(mult))}>
              {fmtMult(mult)}
            </span>
          </div>
        ))}
        {b.insaneBonus > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-[14px]" />
            <span className="text-foreground font-medium w-16 shrink-0">Bonus</span>
            <span className="text-muted-foreground flex-1 truncate">Insane · clean</span>
            <span className={cn("font-mono font-semibold tabular-nums", multClass(b.insaneBonus))}>
              {fmtMult(b.insaneBonus)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-2">
        <span className="text-[11px] text-muted-foreground">Final score</span>
        <span className="font-mono text-sm font-bold text-foreground tabular-nums">
          {b.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
