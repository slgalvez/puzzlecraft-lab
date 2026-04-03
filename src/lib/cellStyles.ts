/**
 * cellStyles.ts
 * src/lib/cellStyles.ts
 *
 * Centralised cell class utilities for all puzzle grids.
 * Replaces the ad-hoc inline style objects / scattered class strings
 * that currently differ between grid components.
 *
 * Usage:
 *   import { getCellClasses, getInputClasses } from "@/lib/cellStyles";
 *
 *   <div className={getCellClasses({ active, correct, error, prefilled, black })} />
 *   <input className={getInputClasses({ active, correct, error })} />
 */

import { cn } from "@/lib/utils";

// ─── Letter/number cell (crossword, kakuro, sudoku, fill-in) ─────────────────

interface CellState {
  active?: boolean;      // currently selected
  correct?: boolean;     // verified correct
  error?: boolean;       // verified wrong
  prefilled?: boolean;   // given clue — not editable
  black?: boolean;       // blocked cell (crossword/kakuro)
  highlighted?: boolean; // part of active word/run
  soft?: boolean;        // pencil/note mode cell (sudoku)
}

export function getCellClasses(state: CellState = {}): string {
  const { active, correct, error, prefilled, black, highlighted, soft } = state;

  if (black) {
    return "bg-foreground border-foreground rounded-sm";
  }

  return cn(
    // Base
    "relative flex items-center justify-center rounded-md border font-medium",
    "transition-all duration-100 select-none",

    // Size — override per puzzle with w-* h-* classes
    "text-sm",

    // Default state
    !active && !correct && !error && !highlighted && !prefilled &&
      "border-border/60 bg-background text-foreground",

    // Highlighted (part of active word)
    highlighted && !active && !correct && !error &&
      "border-primary/30 bg-primary/5",

    // Active / selected
    active &&
      "border-primary border-[2px] bg-primary/8 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]",

    // Prefilled clue
    prefilled &&
      "border-border/40 bg-muted/60 text-foreground font-semibold cursor-default",

    // Correct (verified)
    correct &&
      "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",

    // Error (verified wrong)
    error &&
      "border-destructive/60 bg-destructive/8 text-destructive animate-shake",

    // Soft / pencil mode indicator
    soft && "text-[10px] text-muted-foreground",
  );
}

// ─── Input element inside a cell (for text-entry grids) ──────────────────────

export function getInputClasses(state: Pick<CellState, "active" | "correct" | "error">): string {
  return cn(
    "w-full h-full bg-transparent text-center font-medium uppercase",
    "outline-none caret-transparent",
    state.correct && "text-emerald-700 dark:text-emerald-300",
    state.error   && "text-destructive",
  );
}

// ─── Word-search cell ─────────────────────────────────────────────────────────

interface WordSearchCellState {
  selected?: boolean;   // being dragged across
  found?: boolean;      // part of a found word
  foundColor?: string;  // the highlight color assigned to this word
}

export function getWordSearchCellClasses(state: WordSearchCellState = {}): string {
  return cn(
    "relative flex items-center justify-center rounded-md",
    "font-semibold uppercase text-sm transition-all duration-100 select-none",
    !state.selected && !state.found && "text-foreground",
    state.selected && "bg-primary/20 text-primary scale-105 z-10",
    state.found && !state.selected && "text-foreground",
  );
}

// ─── Nonogram cell ────────────────────────────────────────────────────────────

interface NonogramCellState {
  filled?: boolean;
  crossed?: boolean;  // user marked as empty
  correct?: boolean;
  error?: boolean;
}

export function getNonogramCellClasses(state: NonogramCellState = {}): string {
  return cn(
    "flex items-center justify-center border border-border/40",
    "transition-all duration-100",
    !state.filled && !state.crossed && "bg-background hover:bg-muted/40 cursor-pointer",
    state.filled && !state.error  && "bg-foreground border-foreground",
    state.filled && state.error   && "bg-destructive/70 border-destructive",
    state.crossed && "bg-muted/30 text-muted-foreground text-xs",
    state.correct && state.filled && "bg-emerald-600 border-emerald-600",
  );
}

// ─── Cryptogram cell ──────────────────────────────────────────────────────────

interface CryptogramCellState {
  active?: boolean;
  solved?: boolean;
  hinted?: boolean;
}

export function getCryptogramCellClasses(state: CryptogramCellState = {}): string {
  return cn(
    "relative flex flex-col items-center border-b-2 pb-0.5 px-1",
    "transition-all duration-100",
    !state.active && !state.solved && !state.hinted &&
      "border-border/60",
    state.active  && "border-primary",
    state.solved  && "border-emerald-400/60",
    state.hinted  && "border-amber-400/60",
  );
}
