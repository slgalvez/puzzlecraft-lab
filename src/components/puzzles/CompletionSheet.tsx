/**
 * CompletionSheet.tsx
 * src/components/puzzles/CompletionSheet.tsx
 *
 * Wraps the existing CompletionPanel in an iOS-style bottom sheet
 * that slides up over the puzzle grid when the user solves.
 *
 * Dismissal: backdrop tap, swipe-down on sheet, or Escape key.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptic";
import CompletionPanel from "@/components/puzzles/CompletionPanel";
import { TierUpCelebration } from "@/components/puzzles/TierUpCelebration";
import { checkTierUp, type TierUpEvent } from "@/lib/solveTracker";
import type { Difficulty, PuzzleCategory } from "@/lib/puzzleTypes";

interface CompletionSheetProps {
  open: boolean;
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
  onDismiss?: () => void;
}

const CLOSE_MS = 320;

export function CompletionSheet({
  open,
  onPlayAgain,
  onDismiss,
  ...panelProps
}: CompletionSheetProps) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const firedHaptic = useRef(false);
  const [tierUp, setTierUp] = useState<TierUpEvent | null>(null);

  const dragStart = useRef<{ y: number; t: number } | null>(null);
  const sheetHeight = useRef<number>(0);

  const close = useCallback(() => {
    setAnimateIn(false);
    setDismissed(true);
    setDragY(0);
    setDragging(false);
    setTimeout(() => {
      setVisible(false);
      firedHaptic.current = false;
      onDismiss?.();
    }, CLOSE_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (open && !visible && !dismissed) {
      setVisible(true);
      if (!firedHaptic.current) {
        firedHaptic.current = true;
        hapticSuccess();
        setTimeout(() => {
          const event = checkTierUp();
          if (event) setTierUp(event);
        }, 800);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else if (!open && visible) {
      setAnimateIn(false);
      const t = setTimeout(() => {
        setVisible(false);
        firedHaptic.current = false;
      }, CLOSE_MS);
      return () => clearTimeout(t);
    }
    // Reset dismissed flag when parent toggles open back off → on cycle
    if (!open && dismissed) {
      setDismissed(false);
    }
  }, [open, visible, dismissed]);

  // Escape to dismiss
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  // Pointer drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (!sheetRef.current) return;
    sheetHeight.current = sheetRef.current.offsetHeight;
    dragStart.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dy = e.clientY - dragStart.current.y;
    setDragY(Math.max(0, dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dy = Math.max(0, e.clientY - dragStart.current.y);
    const dt = Math.max(1, performance.now() - dragStart.current.t);
    const velocity = dy / dt;
    dragStart.current = null;
    setDragging(false);
    if (dy > 80 || velocity > 0.5) {
      close();
    } else {
      setDragY(0);
    }
  };

  if (!visible) return null;

  const sheetTransform = dragging
    ? `translateY(${dragY}px)`
    : animateIn
      ? `translateY(${dragY}px)`
      : `translateY(100%)`;

  const backdropOpacity = (() => {
    if (!animateIn) return 0;
    if (!dragging && dragY === 0) return 1;
    const h = sheetHeight.current || 600;
    return Math.max(0, 1 - dragY / h);
  })();

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss"
        className={cn(
          "fixed inset-0 z-40 bg-black/40 cursor-pointer",
          !dragging && "transition-opacity duration-300"
        )}
        style={{ opacity: backdropOpacity }}
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
          "max-h-[92dvh] overflow-y-auto",
          "pb-[env(safe-area-inset-bottom)]",
          !dragging && "transition-transform duration-[320ms] ease-out"
        )}
        style={{ willChange: "transform", transform: sheetTransform, touchAction: "pan-y" }}
      >
        {/* Drag handle area */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        <CompletionPanel
          {...panelProps}
          onPlayAgain={() => {
            setAnimateIn(false);
            setTimeout(() => {
              setVisible(false);
              setDismissed(false);
              onPlayAgain();
            }, 240);
          }}
        />
      </div>

      {/* Tier-up celebration overlay */}
      {tierUp && (
        <TierUpCelebration
          fromTier={tierUp.fromTier}
          toTier={tierUp.toTier}
          rating={tierUp.rating}
          onDismiss={() => setTierUp(null)}
        />
      )}
    </>
  );
}

export default CompletionSheet;
