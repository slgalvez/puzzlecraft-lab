/**
 * CompletionSheet.tsx
 * src/components/puzzles/CompletionSheet.tsx
 *
 * Wraps the existing CompletionPanel in an iOS-style bottom sheet
 * that slides up over the puzzle grid when the user solves.
 *
 * Usage — in each grid component, instead of:
 *   {solved && <CompletionPanel ... />}
 *
 * Use:
 *   <CompletionSheet open={solved} onPlayAgain={handlePlayAgain} ... />
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import { TierUpCelebration } from "@/components/puzzles/TierUpCelebration";
import { checkTierUp, type TierUpEvent } from "@/lib/solveTracker";
import type { Difficulty, PuzzleCategory } from "@/lib/puzzleTypes";

// ── Types (mirror CompletionPanel props) ─────────────────────────────────

interface CompletionSheetProps {
  open: boolean;

  // Pass-through to CompletionPanel
  time: number;
  difficulty: Difficulty;
  accuracy?: number | null;
  assisted?: boolean;
  category?: PuzzleCategory;
  seed?: number;
  dailyCode?: string;
  hintsUsed?: number;
  mistakesCount?: number;

  onPlayAgain: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function CompletionSheet({
  open,
  onPlayAgain,
  ...panelProps
}: CompletionSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const firedHaptic = useRef(false);

  useEffect(() => {
    if (open && !visible) {
      setVisible(true);
      if (!firedHaptic.current) {
        firedHaptic.current = true;
        hapticSuccess();
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else if (!open && visible) {
      setAnimateIn(false);
      const t = setTimeout(() => {
        setVisible(false);
        firedHaptic.current = false;
      }, 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          animateIn ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Puzzle complete"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "rounded-t-3xl bg-background shadow-2xl",
          "transition-transform duration-[320ms] ease-out",
          "max-h-[92vh] overflow-y-auto",
          "pb-[env(safe-area-inset-bottom)]",
          animateIn ? "translate-y-0" : "translate-y-full"
        )}
        style={{ willChange: "transform" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        <CompletionPanel
          {...panelProps}
          onPlayAgain={() => {
            setAnimateIn(false);
            setTimeout(() => {
              setVisible(false);
              onPlayAgain();
            }, 240);
          }}
        />
      </div>
    </>
  );
}

export default CompletionSheet;
