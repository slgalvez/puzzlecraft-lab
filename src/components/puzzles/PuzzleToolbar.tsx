/**
 * PuzzleToolbar.tsx
 * src/components/puzzles/PuzzleToolbar.tsx
 *
 * Shared bottom toolbar that replaces scattered hint/check/reveal buttons
 * across all grid components. Renders a single row of icon+label buttons
 * anchored above the keyboard / safe area.
 *
 * Each button is optional — only pass the handler if that action applies to
 * the current puzzle type. E.g. Sudoku doesn't have "reveal word", Cryptogram
 * doesn't have "check cell".
 *
 * Usage:
 *   <PuzzleToolbar
 *     onHint={() => handleHint()}
 *     hintsRemaining={3}
 *     onCheck={() => handleCheck()}
 *     onReveal={() => handleReveal()}
 *     onClear={() => handleClear()}
 *   />
 */

import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";

// ─── Lucide-compatible mini SVG icons (inlined to avoid import overhead) ─────

const HintIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 12 9 17 20 6"/>
  </svg>
);

const RevealIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
);

const EraseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/>
    <path d="M6.0 11.0 L13 18"/>
  </svg>
);

const NoteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  /** Highlight this button as the primary action */
  primary?: boolean;
  /** Show a count badge (e.g. hints remaining) */
  badge?: number | string;
  /** Grey out and prevent press */
  disabled?: boolean;
  /** Extra class on the button */
  className?: string;
}

interface PuzzleToolbarProps {
  /** Hint button — pass handler if puzzle supports hints */
  onHint?: () => void;
  /** How many hints remain. Omit for unlimited. Shows "0" as disabled. */
  hintsRemaining?: number;
  /** Check the current cell/word for correctness */
  onCheck?: () => void;
  /** Reveal the answer for current cell/word */
  onReveal?: () => void;
  /** Clear current cell or selection */
  onClear?: () => void;
  /** Erase / backspace (for number-based puzzles like Sudoku/Kakuro) */
  onErase?: () => void;
  /** Toggle pencil/note mode (for Sudoku) */
  onNote?: () => void;
  /** Whether note mode is currently active */
  noteActive?: boolean;
  /** Any extra custom actions to append */
  extraActions?: ToolbarAction[];
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PuzzleToolbar = ({
  onHint,
  hintsRemaining,
  onCheck,
  onReveal,
  onClear,
  onErase,
  onNote,
  noteActive,
  extraActions,
  className,
}: PuzzleToolbarProps) => {

  const press = (fn: () => void) => {
    hapticTap();
    fn();
  };

  const hintDisabled = hintsRemaining !== undefined && hintsRemaining <= 0;

  const actions: ToolbarAction[] = [
    ...(onHint ? [{
      icon: <HintIcon />,
      label: hintsRemaining !== undefined ? `Hint (${hintsRemaining})` : "Hint",
      onPress: () => press(onHint),
      primary: true,
      disabled: hintDisabled,
    }] : []),

    ...(onCheck ? [{
      icon: <CheckIcon />,
      label: "Check",
      onPress: () => press(onCheck),
    }] : []),

    ...(onNote ? [{
      icon: <NoteIcon />,
      label: "Notes",
      onPress: () => press(onNote),
      primary: noteActive,
      className: noteActive ? "ring-1 ring-primary" : undefined,
    }] : []),

    ...(onErase ? [{
      icon: <EraseIcon />,
      label: "Erase",
      onPress: () => press(onErase),
    }] : []),

    ...(onClear ? [{
      icon: <ClearIcon />,
      label: "Clear",
      onPress: () => press(onClear),
    }] : []),

    ...(onReveal ? [{
      icon: <RevealIcon />,
      label: "Reveal",
      onPress: () => press(onReveal),
    }] : []),

    ...(extraActions ?? []),
  ];

  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-stretch justify-evenly",
        "border-t border-border/60 bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)] pt-1",
        className
      )}
      role="toolbar"
      aria-label="Puzzle actions"
    >
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.disabled ? undefined : action.onPress}
          disabled={action.disabled}
          aria-label={action.label}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1",
            "py-2 px-1 rounded-xl mx-1 my-1",
            "text-[11px] font-medium transition-all duration-150",
            "active:scale-95 select-none",
            action.disabled
              ? "opacity-30 cursor-not-allowed"
              : action.primary
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            action.className
          )}
        >
          {/* Badge */}
          {action.badge !== undefined && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {action.badge}
            </span>
          )}

          <span className={cn(
            "flex items-center justify-center",
            action.primary ? "text-primary" : "text-muted-foreground"
          )}>
            {action.icon}
          </span>
          <span>{action.label.split(" ")[0]}</span>
        </button>
      ))}
    </div>
  );
};

export default PuzzleToolbar;
