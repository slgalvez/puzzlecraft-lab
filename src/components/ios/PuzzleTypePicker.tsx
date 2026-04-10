/**
 * PuzzleTypePicker.tsx
 * A bottom sheet that appears when a user taps a puzzle type tile.
 * Shows difficulty options before launching.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Clock, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap, hapticSuccess } from "@/lib/haptic";
import { randomSeed } from "@/lib/seededRandom";
import { usePremiumAccess } from "@/lib/premiumAccess";
import UpgradeModal from "@/components/account/UpgradeModal";
import PuzzleIcon from "@/components/puzzles/PuzzleIcon";
import { getSolveRecords } from "@/lib/solveTracker";
import type { PuzzleCategory } from "@/lib/puzzleTypes";

// ── Difficulty config ─────────────────────────────────────────────────────

interface DifficultyOption {
  value: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  plusOnly?: boolean;
}

const DIFFICULTIES: DifficultyOption[] = [
  {
    value: "easy",
    label: "Easy",
    subtitle: "Relaxed pace, common words",
    icon: <Clock size={15} className="text-emerald-500" />,
  },
  {
    value: "medium",
    label: "Medium",
    subtitle: "Standard challenge",
    icon: <Trophy size={15} className="text-amber-500" />,
  },
  {
    value: "hard",
    label: "Hard",
    subtitle: "Trickier clues, less time",
    icon: <Zap size={15} className="text-orange-500" />,
  },
  {
    value: "extreme",
    label: "Extreme",
    subtitle: "Expert-level — Puzzlecraft+",
    icon: <Zap size={15} className="text-rose-500" />,
    plusOnly: true,
  },
  {
    value: "insane",
    label: "Insane",
    subtitle: "Maximum difficulty — Puzzlecraft+",
    icon: <Zap size={15} className="text-violet-600" />,
    plusOnly: true,
  },
];

const TYPE_NAMES: Partial<Record<PuzzleCategory, string>> = {
  crossword: "Crossword",
  "word-search": "Word Search",
  sudoku: "Sudoku",
  kakuro: "Kakuro",
  nonogram: "Nonogram",
  cryptogram: "Cryptogram",
  "word-fill": "Word Fill-In",
  "number-fill": "Number Fill-In",
};

function getBestForDifficulty(type: PuzzleCategory, difficulty: string): number | null {
  try {
    const records = getSolveRecords();
    const matching = records.filter(
      (r: { puzzleType: string; difficulty: string; solveTime: number }) =>
        r.puzzleType === type && r.difficulty === difficulty && r.solveTime > 0
    );
    if (matching.length === 0) return null;
    return Math.min(...matching.map((r: { solveTime: number }) => r.solveTime));
  } catch {
    return null;
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────

interface PuzzleTypePickerProps {
  type: PuzzleCategory | null;
  onClose: () => void;
}

export function PuzzleTypePicker({ type, onClose }: PuzzleTypePickerProps) {
  const navigate = useNavigate();
  const { isPremium } = usePremiumAccess();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const open = type !== null;

  const handleSelect = (difficulty: string, plusOnly?: boolean) => {
    if (!type) return;
    hapticTap();

    if (plusOnly && !isPremium) {
      setUpgradeOpen(true);
      return;
    }

    hapticSuccess();
    onClose();
    navigate(`/quick-play/${type}?seed=${randomSeed()}&d=${difficulty}`);
  };

  if (!open) return null;

  const typeName = type ? TYPE_NAMES[type] ?? type : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "rounded-t-3xl bg-background",
          "pb-[env(safe-area-inset-bottom)]",
          "animate-in slide-in-from-bottom duration-300"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-3">
            {type && <PuzzleIcon type={type} size={28} />}
            <div>
              <p className="font-semibold text-base text-foreground">{typeName}</p>
              <p className="text-xs text-muted-foreground">Choose your difficulty</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Difficulty rows */}
        <div className="px-4 pb-4 space-y-2">
          {DIFFICULTIES.map((d) => {
            const locked = d.plusOnly && !isPremium;
            const best = type ? getBestForDifficulty(type, d.value) : null;

            return (
              <button
                key={d.value}
                onClick={() => handleSelect(d.value, d.plusOnly)}
                className={cn(
                  "w-full flex items-center justify-between rounded-2xl border px-4 py-3.5",
                  "transition-all duration-150 active:scale-[0.98]",
                  locked
                    ? "border-border/40 bg-muted/20 opacity-70"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                {/* Left: icon + label + subtitle */}
                <div className="flex items-center gap-3">
                  <span>{d.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold",
                        locked ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {d.label}
                      </span>
                      {locked && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                          Plus
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{d.subtitle}</p>
                  </div>
                </div>

                {/* Right: personal best or "New" */}
                <div className="text-right">
                  {best ? (
                    <>
                      <p className="font-mono text-xs font-medium text-foreground">{formatTime(best)}</p>
                      <p className="text-[10px] text-muted-foreground">your best</p>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      New
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
