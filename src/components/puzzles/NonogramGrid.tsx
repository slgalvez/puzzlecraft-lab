import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { generateNonogram } from "@/lib/generators/nonogram";
import PuzzleControls from "./PuzzleControls";
import PuzzleTimer from "./PuzzleTimer";
import { usePuzzleTimer } from "@/hooks/usePuzzleTimer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { haptic } from "@/lib/haptic";
import type { Difficulty } from "@/lib/puzzleTypes";

interface Props {
  seed: number;
  difficulty: Difficulty;
  onNewPuzzle: () => void;
}

type CellState = "empty" | "filled" | "marked";

const NonogramGrid = ({ seed, difficulty, onNewPuzzle }: Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const puzzle = useMemo(() => generateNonogram(seed, difficulty), [seed, difficulty]);
  const { rows, cols, solution, rowClues, colClues } = puzzle;

  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: rows }, () => Array(cols).fill("empty"))
  );
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [touchMode, setTouchMode] = useState<"fill" | "mark">("fill");
  const containerRef = useRef<HTMLDivElement>(null);

  const timerKey = `nonogram-${seed}-${difficulty}`;
  const timer = usePuzzleTimer(timerKey, { category: "nonogram", difficulty });

  const maxRowClueLen = Math.max(...rowClues.map((c) => c.length));

  useEffect(() => {
    setCursor([0, 0]);
    containerRef.current?.focus();
  }, [seed, difficulty]);

  const setCellState = (r: number, c: number, state: CellState) => {
    if (timer.isSolved) return;
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = state;
      return next;
    });
    setErrors(new Set());
  };

  const handleCellTap = (r: number, c: number) => {
    if (timer.isSolved) return;
    setCursor([r, c]);
    if (isMobile) haptic();
    if (isMobile) {
      // Mobile: use touchMode
      const current = grid[r][c];
      if (touchMode === "fill") {
        setCellState(r, c, current === "filled" ? "empty" : "filled");
      } else {
        setCellState(r, c, current === "marked" ? "empty" : "marked");
      }
    } else {
      // Desktop: cycle through states
      const current = grid[r][c];
      setCellState(r, c, current === "empty" ? "filled" : current === "filled" ? "marked" : "empty");
    }
    if (!isMobile) containerRef.current?.focus();
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (timer.isSolved) return;
    const [r, c] = cursor;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setCursor([Math.max(0, r - 1), c]); break;
      case "ArrowDown": e.preventDefault(); setCursor([Math.min(rows - 1, r + 1), c]); break;
      case "ArrowLeft": e.preventDefault(); setCursor([r, Math.max(0, c - 1)]); break;
      case "ArrowRight": e.preventDefault(); setCursor([r, Math.min(cols - 1, c + 1)]); break;
      case " ": e.preventDefault(); setCellState(r, c, grid[r][c] === "filled" ? "empty" : "filled"); break;
      case "x": case "X": e.preventDefault(); setCellState(r, c, grid[r][c] === "marked" ? "empty" : "marked"); break;
      case "Delete": case "Backspace": e.preventDefault(); setCellState(r, c, "empty"); break;
    }
  }, [cursor, timer.isSolved, grid, rows, cols]);

  const handleReset = () => {
    setGrid(Array.from({ length: rows }, () => Array(cols).fill("empty")));
    setErrors(new Set());
    setCursor([0, 0]);
    timer.reset();
    containerRef.current?.focus();
  };

  const handleCheck = () => {
    const errs = new Set<string>();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const shouldBeFilled = solution[r][c];
        const isFilled = grid[r][c] === "filled";
        if (shouldBeFilled !== isFilled) errs.add(`${r}-${c}`);
      }
    setErrors(errs);
    if (errs.size === 0) {
      const { isNewBest } = timer.solve();
      toast({ title: "🎉 Congratulations!", description: isNewBest ? "New best time! 🏆" : "Nonogram solved correctly!" });
    } else
      toast({ title: "Not quite right", description: `${errs.size} cell(s) are incorrect.`, variant: "destructive" });
  };

  const cellSize = rows <= 10 ? "w-7 h-7 sm:w-9 sm:h-9" : "w-5 h-5 sm:w-6 sm:h-6";
  const clueTextSize = rows <= 10 ? "text-xs sm:text-sm" : "text-[9px] sm:text-[10px]";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none"
      onKeyDown={handleKeyDown}
    >
      <PuzzleTimer elapsed={timer.elapsed} isRunning={timer.isRunning} isSolved={timer.isSolved} bestTime={timer.bestTime} onPause={timer.pause} onResume={timer.resume} />

      {/* Mobile mode toggle */}
      {isMobile && !timer.isSolved && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation",
              touchMode === "fill" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
            )}
            onClick={() => setTouchMode("fill")}
          >
            ■ Fill
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation",
              touchMode === "mark" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
            )}
            onClick={() => setTouchMode("mark")}
          >
            ✕ Mark
          </button>
        </div>
      )}

      {!isMobile && (
        <p className="mb-3 text-xs text-muted-foreground">
          Arrow keys to move • Space to fill • X to mark • Delete to clear
        </p>
      )}

      <div className="max-w-full overflow-x-auto inline-block">
        {/* Column clues */}
        <div className="flex">
          <div style={{ width: `${maxRowClueLen * 1.5}rem` }} />
          {colClues.map((clue, c) => (
            <div key={c} className={cn("flex flex-col items-center justify-end gap-0.5 pb-1", cellSize.split(" ")[0])}>
              {clue.map((n, i) => (
                <span key={i} className={cn(clueTextSize, "font-medium text-muted-foreground leading-tight")}>{n}</span>
              ))}
            </div>
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center">
            <div className="flex items-center justify-end gap-1 pr-2" style={{ width: `${maxRowClueLen * 1.5}rem` }}>
              {rowClues[r].map((n, i) => (
                <span key={i} className={cn(clueTextSize, "font-medium text-muted-foreground")}>{n}</span>
              ))}
            </div>
            {Array.from({ length: cols }, (_, c) => {
              const state = grid[r][c];
              const hasError = errors.has(`${r}-${c}`);
              const isCursor = cursor[0] === r && cursor[1] === c;

              return (
                <div
                  key={c}
                  className={cn(
                    cellSize,
                    "border border-puzzle-border cursor-pointer select-none flex items-center justify-center transition-colors touch-manipulation",
                    c % 5 === 4 && c < cols - 1 && "border-r-2 border-r-foreground/30",
                    r % 5 === 4 && r < rows - 1 && "border-b-2 border-b-foreground/30",
                    hasError && "bg-puzzle-cell-error",
                    !hasError && state === "filled" && "bg-foreground",
                    !hasError && state === "marked" && "bg-puzzle-cell",
                    !hasError && state === "empty" && "bg-puzzle-cell hover:bg-secondary",
                    isCursor && "ring-2 ring-inset ring-primary"
                  )}
                  onClick={() => handleCellTap(r, c)}
                >
                  {state === "marked" && (
                    <span className={cn("text-muted-foreground font-bold", clueTextSize)}>✕</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <PuzzleControls onReset={handleReset} onCheck={handleCheck} onNewPuzzle={onNewPuzzle} />
    </div>
  );
};

export default NonogramGrid;
